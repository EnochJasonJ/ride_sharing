import { Router } from 'express';
import * as driverController from '../controllers/driverController.js';
import { authenticate, authorize } from '../auth.js';
import { Role } from '../generated/prisma/client.js';

const router = Router();

router.get('/me', authenticate, authorize([Role.DRIVER]), driverController.getDriverStatus);
router.get('/nearby', driverController.getNearbyDrivers);
router.patch('/availability', authenticate, authorize([Role.DRIVER]), driverController.toggleAvailability);
router.patch('/location', authenticate, authorize([Role.DRIVER]), driverController.updateLocation);

export default router;
