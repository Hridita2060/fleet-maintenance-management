import { Router } from 'express';
import { getUsers } from '../controllers/user';
import { authenticate, requireManager } from '../middlewares/auth';

const router = Router();

// Only managers can list users
router.get('/', authenticate, requireManager, getUsers);

export default router;
