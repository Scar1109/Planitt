import express from 'express';
import { getEvents } from '../controllers/events.controller.js';

const router = express.Router();

// GET /api/events
router.get('/', getEvents);

export default router;
