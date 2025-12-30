import express from 'express';
import { requestOTP } from '../controllers/auth.controller.js';

const router = express.Router();

router.post('/request-otp', requestOTP);

export default router;
