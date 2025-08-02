import express from 'express';
import {
  getAllPrivacyController,
  getPrivacyByIdController,
  createPrivacyController,
  updatePrivacyController,
  deletePrivacyController
} from './privacy.controller.js';

import { adminMiddleware, verifyToken } from '../../../../core/middlewares/authMiddleware.js';

const router = express.Router();

// No image upload required
router.get('/',  getAllPrivacyController);
router.get('/:id',  getPrivacyByIdController);
router.post('/',  adminMiddleware, createPrivacyController);
router.put('/:id',  adminMiddleware, updatePrivacyController);
router.delete('/:id',  adminMiddleware, deletePrivacyController);

export default router;
