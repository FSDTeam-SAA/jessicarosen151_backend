import Message from "./message.model.js";


export const sendMessageService = async (resource,message) => {

    let newMessage = await Message.findOne({ resource });

    if (!newMessage) {
         newMessage = new Message({
            resource,
            messages: []
        });
        await newMessage.save();
    }
    else
    {
        const updateMessage = await Message.findByIdAndUpdate(
            newMessage._id,
            { $push: { messages: message } },
            { new: true, upsert: true }
        );
        
        return updateMessage;
    }
};


export const getMessagesByResourceService = async (resourceId,userId) => {

    let messages = await Message.findOne({ resource: resourceId })
    .populate("messages.sender", "firstName lastName email role")

    let updated = false;
    messages.messages.forEach(msg => {
      if (!msg.read && msg.sender._id.toString() !== userId.toString()) {
          console.log("hell")
        msg.read = true;
        updated = true;
      }
    });

    if (updated) await messages.save();
  
    return {
        messages,
    };
};


export const getUserConversationsService = async () => {
    const messages = await Message.find({})
      .populate("resource", "title")
      .populate("messages.sender", "firstName lastName email role")
      .sort({ createdAt: -1 })
      .lean();
  
    return messages;
}