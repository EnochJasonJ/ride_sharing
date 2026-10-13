import { Router } from 'express';
import * as tripController from '../controllers/tripController.js';
import { authenticate } from '../auth.js';

const router = Router();

router.post('/:id/start', authenticate, tripController.startTrip);
router.post('/:id/complete', authenticate, tripController.completeTrip);

export default router;
