import express from 'express';
import { requestOTP, verifyOTP, register, logout } from '../controllers/auth.controller.js';
import { otpRateLimiter, loginRateLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.post('/request-otp', otpRateLimiter, requestOTP);
router.post('/verify-otp', loginRateLimiter, verifyOTP);
router.post('/register', register);
router.post('/logout', logout);

export default router;