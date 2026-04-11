import express from 'express';
import { authenticateToken, authorizeRole } from '../middleware/auth.middleware.js';
import { fillInTerm, showTerm } from '../controllers/term.controller.js';

const router = express.Router();

router.post('/fillInTerm', authenticateToken, authorizeRole('staff'), fillInTerm);

router.get('/showTerm', authenticateToken, authorizeRole('staff'), showTerm);

export default router;