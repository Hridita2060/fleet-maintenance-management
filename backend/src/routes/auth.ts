import { Router } from 'express';
import { login, me, logout } from '../controllers/auth';
import { authenticate } from '../middlewares/auth';

const router = Router();

router.post('/login', login);
router.post('/logout', logout);
router.get('/me', authenticate, me);

export default router;
