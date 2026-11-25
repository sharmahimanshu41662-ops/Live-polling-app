const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

// सर्वर की याददाश्त (हर रूम का डेटा यहाँ सेव रहेगा)
const rooms = {};

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // 1. जब कोई रूम में जुड़े (चाहे समय पर या लेट)
  socket.on("join_room", (roomCode) => {
    socket.join(roomCode);

    // अगर रूम की नोटबुक नहीं बनी है, तो नई बनाएं
    if (!rooms[roomCode]) {
      rooms[roomCode] = {
        poll: null,
        votes: { A: 0, B: 0 },
        questions: [],
      };
    }

    // नए जुड़ने वाले यूज़र को तुरंत पुराना चल रहा डेटा भेज दें
    socket.emit("room_state", rooms[roomCode]);
  });

  // 2. जब Host नया पोल लॉन्च करे
  socket.on("create_poll", (data) => {
    if (!rooms[data.roomCode]) {
      rooms[data.roomCode] = { poll: null, votes: { A: 0, B: 0 }, questions: [] };
    }
    rooms[data.roomCode].poll = data;
    rooms[data.roomCode].votes = { A: 0, B: 0 };

    io.to(data.roomCode).emit("receive_poll", data);
  });

  // 3. जब कोई वोट दे
  socket.on("send_vote", (data) => {
    if (rooms[data.roomCode]) {
      rooms[data.roomCode].votes[data.option] += 1;
    }
    io.to(data.roomCode).emit("receive_vote", data);
  });

  // 4. जब कोई Q&A सवाल पूछे
  socket.on("send_question", (data) => {
    if (rooms[data.roomCode]) {
      rooms[data.roomCode].questions.push(data.text);
    }
    io.to(data.roomCode).emit("receive_question", data);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log("Smart Server running on port " + PORT);
});
