import express from 'express';
import { createTest, getTests, getTestById, updateTest, deleteTest } from './b.controller.js';

const router = express.Router();

router.post('/', createTest);
router.get('/', getTests);
router.get('/:id', getTestById);
router.put('/:id', updateTest);
router.delete('/:id', deleteTest);

export default router;
