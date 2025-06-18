import Resource from "../resource/resource.model.js";
import ResourceQuestion from "./qa.model.js";


export const postQuestionService = async (resourceId, questionText, userId) => {
  const newQuestion = await ResourceQuestion.create({
    resource: resourceId,
    question: questionText,
    askedBy: userId || null
  });
  return newQuestion;
};


export const getQuestionsByResourceService = async (resourceId) => {
  return await ResourceQuestion.find({ resource: resourceId })
    .populate("askedBy", "firstName role")
    .populate("replies.sender", "firstName role")
    .sort({ createdAt: -1 });
};


export const replyToQuestionService = async (questionId, message, senderId) => {
  const question = await ResourceQuestion.findById(questionId);
  if (!question) throw new Error("Question not found");

  question.replies.push({ message, sender: senderId });
  question.isAnswered = true;
  await question.save();

  return question;
};


export const getMyResourceQuestionsService = async (userId) => {
  const myResources = await Resource.find({ createdBy: userId }).select("_id");
  const resourceIds = myResources.map(res => res._id);

  return await ResourceQuestion.find({ resource: { $in: resourceIds } })
    .populate("askedBy", "name")
    .populate("replies.sender", "name")
    .sort({ createdAt: -1 });
};
