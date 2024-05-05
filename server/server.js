// server.js

const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const mongoose = require("mongoose");
const Document = require("./Document");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3001;

mongoose.connect(process.env.MONGO_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: false,
  useCreateIndex: true,
}).then(() => {
  console.log("MongoDB connected");
}).catch(err => {
  console.error("MongoDB connection error:", err);
});

const defaultValue = "";

io.on("connection", socket => {
  console.log("Client connected");

  // Emit console logs to the webpage
  socket.on("console-log", message => {
    io.emit("console-log", message);
  });

  socket.on("get-document", async documentId => {
    console.log("Fetching document:", documentId);
    const document = await findOrCreateDocument(documentId)
    socket.join(documentId)
    socket.emit("load-document", document.data)

    socket.on("send-changes", delta => {
      socket.broadcast.to(documentId).emit("receive-changes", delta)
    })

    socket.on("save-document", async data => {
      await Document.findByIdAndUpdate(documentId, { data })
    })
  })
})

async function findOrCreateDocument(id) {
  if (id == null) return

  const document = await Document.findById(id)
  if (document) {
    console.log("Document found:", id);
    return document;
  }
  console.log("Creating new document:", id);
  return await Document.create({ _id: id, data: defaultValue })
}

// Serve static files from the React app's build directory
app.use(express.static(path.join(__dirname, "client/build")));

// Define route for all other routes to serve the React app
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname + "/client/build/index.html"));
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
