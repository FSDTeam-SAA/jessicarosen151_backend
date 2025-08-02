import express from 'express';
import {
  getAllTermsController,
  getTermsByIdController,
  createTermsController,
  updateTermsController,
  deleteTermsController
} from './terms.controller.js';
import { adminMiddleware, verifyToken } from '../../../../core/middlewares/authMiddleware.js';

const router = express.Router();

// Routes for Terms (no image, so no multer)
router.get('/', verifyToken, getAllTermsController);
router.get('/:id', verifyToken, getTermsByIdController);
router.post('/', verifyToken, adminMiddleware, createTermsController);
router.put('/:id', verifyToken, adminMiddleware, updateTermsController);
router.delete('/:id', verifyToken, adminMiddleware, deleteTermsController);

export default router;
