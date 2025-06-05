import express from 'express';
import {
  promoteToSellerController,
  getAllSellersController,
  getSellerByIdController,
  deleteSellerByIdController
} from './application.controller.js';
import { verifyToken } from '../../../core/middlewares/authMiddleware.js';

const router = express.Router();

router
  .route('/')
  .get(verifyToken, getAllSellersController); 

router
  .route('/apply')
  .post(verifyToken, promoteToSellerController); 

router
  .route('/:id')
  .get(verifyToken, getSellerByIdController)      
  .delete(verifyToken, deleteSellerByIdController); 

export default router;
