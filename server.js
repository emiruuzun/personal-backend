const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const path = require("path");
const http = require("http");
const onlineUsers = require("./util/onlineUsers");
const socketio = require("socket.io");
const connectDatabase = require("./helpers/database/connectDatabase");
const customErrorHandler = require("./middlewares/errors/cutomErrorHandler"); // Düzeltildi: 'cutomErrorHandler' -> 'customErrorHandler'
const { startAllJobs } = require("./helpers/database/cronJob");
const routers = require("./routers/index");
// Socket.io connection event

// Environment variables
dotenv.config({
  path: "./config/config.env",
});

// MongoDB Connection
connectDatabase();

// Start the Cron Job to delete unverified users
startAllJobs();

const app = express();

// Express - Body Middleware
app.use(express.json());

// Cors
// app.use(cors({
//   origin: 'http://localhost:4000',
//   credentials: true
// }));
// Cors
// app.use(
//   cors({
//     origin: function (origin, callback) {
//       callback(null, true); // Herhangi bir origin'e izin ver
//     },
//     credentials: true, // Credentials modunu aç
//   })
// );
app.use(
  cors({
    origin: process.env.ORIGIN,
    credentials: true,
  })
);

// Cookie Parser
app.use(cookieParser());

// Static Files
app.use(express.static(path.join(__dirname, "public")));

// Create HTTP server and pass the Express app
const server = http.createServer(app);

// Attach socket.io to the server

const io = socketio(server, {
  cors: {
    origin: process.env.ORIGIN,
    credentials: true,
  },
});

// Use a middleware to attach io to the req object
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Routers Middleware should be placed after the io middleware
app.use("/", routers);
console.log("mrb");

// Custom Error Handler
app.use(customErrorHandler);

// Socket İo Connection
io.on("connection", (socket) => {
  const userId = socket.handshake.query.userId;
  if (userId) {
    onlineUsers[userId] = socket.id;
    console.log(userId, "user connected:", socket.id);
  }

  socket.on("disconnect", () => {
    if (userId && onlineUsers[userId]) {
      delete onlineUsers[userId];
    }
  });
});

// Start server
const PORT = process.env.PORT;
server.listen(PORT, () => {
  console.log(`App started on ${PORT} : ${process.env.NODE_ENV}`);
});
//TEST
