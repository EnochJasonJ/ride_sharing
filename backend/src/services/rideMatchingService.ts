import { RideRequestStatus, TripStatus } from '../generated/prisma/client.js';
import { prisma } from '../lib/prisma.js';

export const dispatchNextMatchingRide = async (driverProfileId: string) => {
  return prisma.$transaction(async (tx) => {
    const claimedDriver = await tx.driverProfile.updateMany({
      where: { id: driverProfileId, isAvailable: true },
      data: { isAvailable: false },
    });

    if (claimedDriver.count === 0) return null;

    const ride = await tx.rideRequest.findFirst({
      where: {
        status: RideRequestStatus.MATCHING,
        trip: { is: null },
      },
      orderBy: { createdAt: 'asc' },
    });

    if (!ride) {
      await tx.driverProfile.update({
        where: { id: driverProfileId },
        data: { isAvailable: true },
      });
      return null;
    }

    await tx.rideRequest.update({
      where: { id: ride.id },
      data: { status: RideRequestStatus.ASSIGNED },
    });

    return tx.trip.create({
      data: {
        rideRequestId: ride.id,
        driverProfileId,
        status: TripStatus.NOT_STARTED,
      },
      include: { rideRequest: true },
    });
  });
};
