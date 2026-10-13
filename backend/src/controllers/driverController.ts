import type { Request, Response } from 'express';
import type { AuthRequest } from '../auth.js';
import { prisma } from '../lib/prisma.js';

export const toggleAvailability = async (req: AuthRequest, res: Response) => {
  try {
    const { available } = req.body;
    const profile = await prisma.driverProfile.update({
      where: { userId: req.user!.userId },
      data: { isAvailable: available },
    });
    res.json(profile);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

export const updateLocation = async (req: AuthRequest, res: Response) => {
  try {
    const { latitude, longitude } = req.body;
    const profile = await prisma.driverProfile.update({
      where: { userId: req.user!.userId },
      data: { latitude, longitude },
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
