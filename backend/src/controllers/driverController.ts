import type { Request, Response } from 'express';
import type { AuthRequest } from '../auth.js';
import { prisma } from '../lib/prisma.js';
import { dispatchNextMatchingRide } from '../services/rideMatchingService.js';

export const getDriverStatus = async (req: AuthRequest, res: Response) => {
  try {
    const profile = await prisma.driverProfile.findUnique({
      where: { userId: req.user!.userId },
      include: {
        trips: {
          where: { status: { in: ['NOT_STARTED', 'STARTED'] } },
          include: { rideRequest: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    res.json({
      isAvailable: profile?.isAvailable ?? false,
      location: {
        lat: profile?.latitude ?? 0,
        lng: profile?.longitude ?? 0,
      },
      activeTrip: profile?.trips[0] ?? null,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const toggleAvailability = async (req: AuthRequest, res: Response) => {
  try {
    const { available } = req.body;
    const userId = req.user!.userId;
    if (typeof available !== 'boolean') {
      return res.status(400).json({ error: 'available must be a boolean' });
    }

    const profile = await prisma.driverProfile.upsert({
      where: { userId },
      create: { userId, isAvailable: available },
      update: { isAvailable: available },
    });

    if (available) {
      await dispatchNextMatchingRide(profile.id);
    }

    res.json(profile);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

export const updateLocation = async (req: AuthRequest, res: Response) => {
  try {
    const { latitude, longitude } = req.body;
    if (
      typeof latitude !== 'number' ||
      typeof longitude !== 'number' ||
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude)
    ) {
      return res.status(400).json({ error: 'latitude and longitude must be valid numbers' });
    }

    const userId = req.user!.userId;
    const profile = await prisma.driverProfile.upsert({
      where: { userId },
      create: { userId, latitude, longitude },
      update: { latitude, longitude },
    });
    res.json(profile);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

export const getNearbyDrivers = async (req: Request, res: Response) => {
  const { lat, lng, radius: radiusQuery } = req.query;
  const latitude = typeof lat === 'string' ? Number.parseFloat(lat) : Number.NaN;
  const longitude = typeof lng === 'string' ? Number.parseFloat(lng) : Number.NaN;
  const radius = typeof radiusQuery === 'string' ? Number.parseFloat(radiusQuery) : 5;

  if (![latitude, longitude, radius].every(Number.isFinite) || radius < 0) {
    return res.status(400).json({ error: 'Latitude, longitude, and radius must be valid numbers' });
  }

  const drivers = await prisma.driverProfile.findMany({
    where: { isAvailable: true },
    include: { user: true, vehicle: true }
  });

  const nearby = drivers
    .map(d => {
      const dist = haversine(latitude, longitude, d.latitude, d.longitude);
      return { ...d, distance: dist };
    })
    .filter(d => d.distance <= radius)
    .sort((a, b) => a.distance - b.distance);

  res.json(nearby);
};

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
