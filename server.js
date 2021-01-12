// import
import express from "express";
import mongoose from "mongoose";
import Pusher from "pusher";
import cors from "cors";
import mongoData from "./mongoData.js";

// app config

// this is the application instance
// - this creates the application and allows us to write api routes
const app = express();

// port 9000 is where the application is running
const port = process.env.PORT || 9000;

const pusher = new Pusher({
  // your pusher details go here
});

// middleware
app.use(cors())
app.use(express.json());

// DB config
const connection_url = "mongodb+srv://admin:QmhqR3CDlkcpKIfg@cluster0.ybgmo.mongodb.net/whatsappDB?retryWrites=true&w=majority"

mongoose.connect(connection_url, {
    useCreateIndex: true,
    useNewUrlParser: true,
    useUnifiedTopology: true
});

// const db = mongoose.connection;

mongoose.connection.once("open", () => {
    console.log("DB Connected");

    // change stream listens for changes in the collections in our DB
    const changeStream = mongoose.connection.collection("conversations").watch();

    changeStream.on("change", (change) => {
        // console.log(change);

        if(change.operationType === "insert") {
            pusher.trigger("chats", "newChat", {
                "change": change
            })
        } else if (change.operationType === 'update') {
            pusher.trigger("messages", "newMessage", {
                "change": change
            })
        } else {
            console.log("Error triggering Pusher...");
        }
    }) 
});

// api routes
// status codes
// - 200 - "OK" for the server request
// - 201 - "Created OK" when we send a message and it stores successfully in the DB
// - 500 - Internal Server Error
app.get("/", (req, res) => res.status(200).send("hello world"));

// Post method used for posting a new chat room
app.post("/new/chatroom", (req, res) => {
    const dbChat = req.body

    mongoData.create(dbChat, (err, data) => {
        if (err) {
            res.status(500).send(err);
        } else {
            res.status(201).send(data);
        }
    });
});

// Post method used for posting a new message
app.post("/new/message", (req, res) => {

    mongoData.update(
        { _id: req.query.id },
        { $push: { conversation: req.body } },
        (err, data) => {
            if (err) {
                console.log("Error saving message...");
                console.log(err);

                res.status(500).send(err);
            } else {
                res.status(201).send(data);
            } 
        }
    );
});

// Get method is used to get the list of all chats in the DB and push them to the frontend
app.get("/get/conversationList", (req, res) => {

    mongoData.find((err, data) => {
        if(err) {
            res.status(500).send(err);
        } else {
            
            // sort the data so that we get the chats in the correct order
            data.sort((b, a) => {
                return a.timestamp - b.timestamp;
            });

            // create a chat array which will be pushed back to the frontend
            let conversations = []

            // this is the structure for the Sidebar Chat
            data.map((conversationData) => {
                const conversationInfo = {
                    id: conversationData._id,
                    name: conversationData.chatName,
                    timestamp: conversationData.conversation[0].timestamp
                }

                // push to conversation array
                conversations.push(conversationInfo)
            })
            
            res.status(200).send(conversations);
        }
    });

});

// Get Method is used to retrieve the actual content inside the conversation
app.get("/get/conversation", (req, res) => {
    const id = req.query.id;
    
    // filter based on the id that is retrieved
    mongoData.find({ _id: id }, (err, data) => {
        if(err) {
            res.status(500).send(err);
        } else {
            res.status(200).send(data);
        }
    });
});

// GET method is used for the retrieve last message in the Sidebar Chat
app.get("/get/lastMessage", (req, res) => {
    const id = req.query.id;
    
    // filter based on the id that is retrieved
    mongoData.find({ _id: id }, (err, data) => {
        if(err) {
            res.status(500).send(err);
        } else {
            let chatData = data[0].conversation

            // sort it so that the newest message is first on the list
            chatData.sort((b, a) => {
                return a.timestamp - b.timestamp;
            });

            // send the newest message since it will be at index 0
            res.status(200).send(chatData[0]);
        }
    }); 
});

// listener
app.listen(port, () => console.log(`Listening on localhost:${port}`));
