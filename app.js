const http = require('http');
const server = require('./server'); // my existing express server
const { Server } = require('socket.io');
const registerChatSocket = require('./utils/chatSocket');
const { authenticateWsToken } = require('./middleware/auth');
require('dotenv').config();

const app = http.createServer(server);

const io = new Server(app, {
    cors: {
        origin: ['http://localhost:5173', 'http://localhost:3000', process.env.FRONTEND_URL],
        credentials: true,
    },
});

//socket authentication middleware
io.use(authenticateWsToken);

// Register chat/socket events
registerChatSocket(io);

module.exports = app;
