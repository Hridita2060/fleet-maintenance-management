import { Router } from 'express';
import { getServiceRecords, createServiceRecord, updateServiceRecord, assignTechnician, removeTechnician } from '../controllers/serviceRecord';
import { authenticate, requireManager } from '../middlewares/auth';

const router = Router();

// Viewing records is for both roles, but tech only sees assigned ones (handled in controller)
router.get('/', authenticate, getServiceRecords);

// Managers create records
router.post('/', authenticate, requireManager, createServiceRecord);

// Updating records can be done by both, but tech has strict limits
router.patch('/:id', authenticate, updateServiceRecord);

// Assignments are for managers only
router.post('/:id/assignments', authenticate, requireManager, assignTechnician);
router.delete('/:id/assignments/:techId', authenticate, requireManager, removeTechnician);

export default router;
