import { Router } from 'express';
import { getVehicles, getVehicleById, createVehicle, updateVehicle } from '../controllers/vehicle';
import { authenticate, requireManager } from '../middlewares/auth';

const router = Router();

// Only authenticated users can view vehicles
router.get('/', authenticate, getVehicles);
router.get('/:id', authenticate, getVehicleById);

// Only managers can create or edit vehicles
router.post('/', authenticate, requireManager, createVehicle);
router.patch('/:id', authenticate, requireManager, updateVehicle);

export default router;
