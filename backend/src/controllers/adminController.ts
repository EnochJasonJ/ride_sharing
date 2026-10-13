import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

export const getStats = async (req: Request, res: Response) => {
  try {
    const totalUsers = await prisma.user.count();
    const activeDrivers = await prisma.driverProfile.count({
      where: { isAvailable: true }
    });
    const totalRides = await prisma.rideRequest.count();

    res.json({
      totalUsers,
      activeDrivers,
      totalRides
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
