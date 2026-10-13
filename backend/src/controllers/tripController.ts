import type { Request, Response } from 'express';
import { TripStatus } from '../generated/prisma/client.js';
import type { AuthRequest } from '../auth.js';
import { prisma } from '../lib/prisma.js';
import { dispatchNextMatchingRide } from '../services/rideMatchingService.js';

export const startTrip = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    if (typeof id !== 'string') {
      return res.status(400).json({ error: 'Invalid trip id' });
    }

    const trip = await prisma.trip.findUnique({ where: { id } });
    const driverProfile = await prisma.driverProfile.findUnique({
      where: { userId: req.user!.userId }
    });

    if (!driverProfile || trip?.driverProfileId !== driverProfile.id) {
      return res.status(403).json({ error: 'Forbidden: Only the assigned driver can start this trip' });
    }

    const updatedTrip = await prisma.trip.update({
      where: { id },
      data: { 
        status: TripStatus.STARTED,
        startedAt: new Date()
      }
    });

    res.json(updatedTrip);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

export const completeTrip = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    if (typeof id !== 'string') {
      return res.status(400).json({ error: 'Invalid trip id' });
    }

    const driverProfile = await prisma.driverProfile.findUnique({
      where: { userId: req.user!.userId }
    });

    const trip = await prisma.trip.findUnique({ where: { id } });
    if (!trip || !driverProfile || trip.driverProfileId !== driverProfile.id) {
      return res.status(403).json({ error: 'Forbidden: Only the assigned driver can complete this trip' });
    }

    const updatedTrip = await prisma.trip.update({
      where: { id },
      data: { 
        status: TripStatus.COMPLETED,
        completedAt: new Date()
      }
    });

    // Create fare and make driver available
    await prisma.$transaction([
      prisma.fare.create({
        data: {
          tripId: id,
          amount: 20.00, // Simplified fixed fare for MVP or lookup from RideRequest
        }
      }),
      prisma.driverProfile.update({
        where: { id: driverProfile.id },
        data: { isAvailable: true }
      })
    ]);
    await dispatchNextMatchingRide(driverProfile.id);

    res.json(updatedTrip);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};
