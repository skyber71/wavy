require("dotenv").config();
const mongoose  = require("mongoose");
const app = require("express")();
const http = require("http").Server(app);
mongoose.connect("mongodb://localhost:27017/wave");
const User  = require("./models/userModel")
const userRoute = require("./routes/userRoute")
app.use("/",userRoute);
const Chat = require("./models/chatModel");
const crypto = require("crypto");
const algorithm = process.env.ALGORITHM;
const key = process.env.KEY;

const io = require("socket.io")(http);
var usp = io.of("/user-namespace");
usp.on("connection",async (socket)=>{
    console.log("User Connected");
    var userId = socket.handshake.auth.token;
    await User.findByIdAndUpdate({_id:userId},{$set:{ is_online:'1'}});
    socket.broadcast.emit("getOnlineUser",{user_id:userId});



    socket.on("disconnect",async ()=>{
        console.log("Usr disconnected");
        var userId = socket.handshake.auth.token;
        await User.findByIdAndUpdate({_id:userId},{$set:{ is_online:'0'}});
        socket.broadcast.emit("getOfflineUser",{user_id:userId});


    });

    socket.on("newChat",(data)=>{
        // const originalIV = Buffer.from(data.iv, "base64");
        // const decipher = crypto.createDecipheriv(algorithm,key,originalIV);
        // let decryptedData = decipher.update(data.message,"hex","utf-8");
        // decryptedData += decipher.final("utf-8");
        socket.broadcast.emit("loadNewChat", {receiverId:data.receiverId, senderId:data.senderId, message:data.message});
    });

    socket.on("existsChat", async (data)=>{
        var chats  = await Chat.find({ $or:[
            {senderId: data.senderId,receiverId: data.receiverId},
            {senderId: data.receiverId,receiverId: data.senderId},
        ]});
        for(let i = 0;i<chats.length;i++){
            const originalIV = Buffer.from(chats[i]["iv"], "base64");
            const decipher = crypto.createDecipheriv(algorithm,key,originalIV);
            let decryptedData = decipher.update(chats[i]["message"],"hex","utf-8");
            decryptedData += decipher.final("utf-8");
            chats[i]["message"] = decryptedData;
        }
        socket.emit("loadChat",{chats :chats});
    })
});

http.listen(3000,()=>{console.log("Server Started on Port 3000");})
