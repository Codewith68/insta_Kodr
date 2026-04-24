import http from "http";
import app from "./src/app.js";
import config from "./src/config/config.js";
import { connectDB } from "./src/config/db.config.js";
import { initSocket } from "./src/socket.js";

const server = http.createServer(app);

// Initialize Socket.IO on the HTTP server
initSocket(server);

server.listen(config.PORT, () => {
  console.log(`Server running on port ${config.PORT}`);
  connectDB();
});