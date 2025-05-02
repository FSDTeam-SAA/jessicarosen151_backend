import Test from "./b.model.js";


export const getTestsService = async () => {
  try {
    const tests = await Test.find();
    return tests;
  } catch (error) {
    throw error;
  }
};

export const getTestByIdService = async (id) => {
  try {
    const test = await Test.findById(id);
    if (!test) {
      throw new Error('Test not found');
    }
    return test;
  } catch (error) {
    throw error;
  }
};

export const createTestService = async (test) => {
  try {
    const newTest = await Test.create(test);
    return newTest;
  } catch (error) {
    throw error;
  }
};

export const updateTestService = async (id, test) => {
  try {
    const updatedTest = await Test.findByIdAndUpdate(id, test, {
      new: true,
      runValidators: true,
    });
    if (!updatedTest) {
      throw new Error('Test not found');
    }
    return updatedTest;
  } catch (error) {
    throw error;
  }
};

export const deleteTestService = async (id) => {
  try {
    const deletedTest = await Test.findByIdAndDelete(id);
    if (!deletedTest) {
      throw new Error('Test not found');
    }
    return deletedTest;
  } catch (error) {
    throw error;
  }
};
