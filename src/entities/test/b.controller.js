import { getTestsService, getTestByIdService, createTestService, updateTestService, deleteTestService } from './b.service.js';

export const getTests = async (req, res) => {
  try {
    const tests = await getTestsService();
    res.status(200).json(tests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getTestById = async (req, res) => {
  try {
    const test = await getTestByIdService(req.params.id);
    if (!test) return res.status(404).json({ message: 'Test not found' });
    res.status(200).json(test);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createTest = async (req, res) => {
  try {
    const test = await createTestService(req.body);
    res.status(201).json(test);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateTest = async (req, res) => {
  try {
    const test = await updateTestService(req.params.id, req.body);
    if (!test) return res.status(404).json({ message: 'Test not found' });
    res.status(200).json(test);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteTest = async (req, res) => {
  try {
    const test = await deleteTestService(req.params.id);
    if (!test) return res.status(404).json({ message: 'Test not found' });
    res.status(200).json({ message: 'Test deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

