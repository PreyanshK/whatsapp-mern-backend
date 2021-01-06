import mongoose from "mongoose";

// there is where we will defining our Data Schema
const whatsappSchema = mongoose.Schema({
    chatName: String,
    conversation: [
        {
            message: String,
            timestamp: String,
            user: {
                displayName: String,
                email: String,
                photo: String,
                uid: String
            }
        }
    ]
});

// collection
export default mongoose.model("conversations", whatsappSchema);
