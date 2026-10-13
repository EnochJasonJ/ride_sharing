import { Router } from 'express';
import * as rideController from '../controllers/rideController.js';
import { authenticate } from '../auth.js';

const router = Router();

router.post('/', authenticate, rideController.createRideRequest);
router.get('/', authenticate, rideController.getRides);
router.get('/:id', authenticate, rideController.getRideById);
router.post('/:id/cancel', authenticate, rideController.cancelRide);

export default router;
