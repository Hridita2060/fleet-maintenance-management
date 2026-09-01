import { Router } from 'express';
import { getDashboardMetrics } from '../controllers/dashboard';
import { getAlerts, dismissAlert } from '../controllers/alerts';
import { authenticate } from '../middlewares/auth';

const router = Router();

router.get('/metrics', authenticate, getDashboardMetrics);
router.get('/alerts', authenticate, getAlerts);
router.patch('/alerts/:id/dismiss', authenticate, dismissAlert);

export default router;
