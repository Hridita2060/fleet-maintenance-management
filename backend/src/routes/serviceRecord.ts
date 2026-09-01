import { Router } from 'express';
import { getServiceRecords, createServiceRecord, updateServiceRecord, assignTechnician, removeTechnician, getAuditHistory } from '../controllers/serviceRecord';
import { authenticate, requireManager } from '../middlewares/auth';

const router = Router();

router.get('/', authenticate, getServiceRecords);
router.post('/', authenticate, requireManager, createServiceRecord);
router.patch('/:id', authenticate, updateServiceRecord);
router.post('/:id/assignments', authenticate, requireManager, assignTechnician);
router.delete('/:id/assignments/:techId', authenticate, requireManager, removeTechnician);
router.get('/:id/audit', authenticate, getAuditHistory);

export default router;
