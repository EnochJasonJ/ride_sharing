import type { Request, Response } from 'express';
import { RideRequestStatus, TripStatus } from '../generated/prisma/client.js';
import type { AuthRequest } from '../auth.js';
import { prisma } from '../lib/prisma.js';

const BASE_FARE = 5.00;
const PER_KM_RATE = 2.00;

function calculateFare(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  return BASE_FARE + (distance * PER_KM_RATE);
}

export const createRideRequest = async (req: AuthRequest, res: Response) => {
  try {
    const { pickupLat, pickupLng, dropoffLat, dropoffLng } = req.body;
    const fare = calculateFare(pickupLat, pickupLng, dropoffLat, dropoffLng);
    
    const rideRequest = await prisma.rideRequest.create({
      data: {
        passengerId: req.user!.userId,
        pickupLat,
        pickupLng,
        dropoffLat,
        dropoffLng,
        estimatedFare: fare,
        status: RideRequestStatus.REQUESTED
      }
    });

    // Start matching process (simplified: synchronous)
    await matchDriver(rideRequest.id);

    res.status(201).json(rideRequest);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

async function matchDriver(rideRequestId: string) {
  const ride = await prisma.rideRequest.findUnique({ where: { id: rideRequestId } });
  if (!ride) return;

  await prisma.rideRequest.update({
    where: { id: rideRequestId },
    data: { status: RideRequestStatus.MATCHING }
  });

  const availableDrivers = await prisma.driverProfile.findMany({
    where: { isAvailable: true },
    include: { user: true }
  });

  if (availableDrivers.length === 0) {
    // No drivers available, stays in MATCHING or goes to CANCELLED
    return;
  }

  const sortedDrivers = availableDrivers
    .map(d => ({
      ...d,
      distance: haversine(ride.pickupLat, ride.pickupLng, d.latitude, d.longitude)
    }))
    .sort((a, b) => a.distance - b.distance);

  const closestDriver = sortedDrivers[0];
  if (!closestDriver) return;

  await prisma.$transaction([
    prisma.rideRequest.update({
      where: { id: rideRequestId },
      data: { status: RideRequestStatus.ASSIGNED }
    }),
    prisma.trip.create({
      data: {
        rideRequestId,
        driverProfileId: closestDriver.id,
        status: TripStatus.NOT_STARTED
      }
    }),
    prisma.driverProfile.update({
      where: { id: closestDriver.id },
      data: { isAvailable: false }
    })
  ]);
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export const getRides = async (req: AuthRequest, res: Response) => {
  const rides = await prisma.rideRequest.findMany({
    where: { passengerId: req.user!.userId },
    include: { trip: true }
  });
  res.json(rides);
};

export const getRideById = async (req: Request, res: Response) => {
  const { id } = req.params;
  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid ride id' });
  }

  const ride = await prisma.rideRequest.findUnique({
    where: { id },
    include: { trip: { include: { driverProfile: { include: { user: true, vehicle: true } } } } }
  });
  if (!ride) return res.status(404).json({ error: 'Ride not found' });
  res.json(ride);
};

export const cancelRide = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    if (typeof id !== 'string') {
      return res.status(400).json({ error: 'Invalid ride id' });
    }

    const ride = await prisma.rideRequest.findUnique({ where: { id } });
    if (!ride || ride.passengerId !== req.user!.userId) {
      return res.status(404).json({ error: 'Ride not found' });
    }

    const status = ride.status;
    await prisma.$transaction([
      prisma.rideRequest.update({
        where: { id },
        data: { status: RideRequestStatus.CANCELLED }
      }),
      // If assigned, cancel trip and make driver available
      prisma.trip.updateMany({
        where: { rideRequestId: id },
        data: { status: TripStatus.CANCELLED }
      })
    ]);

    // If there was a driver assigned, make them available again
    const trip = await prisma.trip.findUnique({ where: { rideRequestId: id } });
    if (trip) {
      await prisma.driverProfile.update({
        where: { id: trip.driverProfileId },
        data: { isAvailable: true }
      });
    }

    res.json({ message: 'Ride cancelled' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};
