import { Router } from 'express';
import * as adminController from '../controllers/adminController.js';
import { authenticate, authorize } from '../auth.js';
import { Role } from '../generated/prisma/client.js';

const router = Router();

router.get('/stats', authenticate, authorize([Role.ADMIN]), adminController.getStats);

export default router;
