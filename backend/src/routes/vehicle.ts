import { Router } from 'express';
import { getVehicles, createVehicle, updateVehicle, getVehicleById } from '../controllers/vehicle';
import { bulkImportOdometer } from '../controllers/vehicleCsv';
import { authenticate, requireManager } from '../middlewares/auth';
import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage() });
const router = Router();

router.get('/', authenticate, getVehicles);
router.post('/', authenticate, requireManager, createVehicle);
router.get('/:id', authenticate, getVehicleById);
router.patch('/:id', authenticate, requireManager, updateVehicle);

router.post('/bulk-odometer', authenticate, requireManager, upload.single('file'), bulkImportOdometer);

export default router;
