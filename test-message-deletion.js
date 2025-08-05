// Test script for real-time message deletion
// Run this after starting your server to test the implementation

const io = require('socket.io-client');
const axios = require('axios');

// Configuration
const SERVER_URL = 'http://localhost:3000'; // Adjust to your server port
const API_BASE = `${SERVER_URL}/api`;

// Test tokens (replace with actual user tokens)
const USER1_TOKEN = 'your_user1_jwt_token';
const USER2_TOKEN = 'your_user2_jwt_token';

async function testRealTimeMessageDeletion() {
    console.log('🧪 Testing Real-time Message Deletion Implementation\n');

    try {
        // 1. Connect two users via socket
        console.log('1. Connecting users via WebSocket...');

        const socket1 = io(SERVER_URL, {
            withCredentials: true,
            extraHeaders: {
                cookie: `token=${USER1_TOKEN}`
            }
        });

        const socket2 = io(SERVER_URL, {
            withCredentials: true,
            extraHeaders: {
                cookie: `token=${USER2_TOKEN}`
            }
        });

        // 2. Set up message deletion listeners
        socket2.on('messageDeleted', (data) => {
            console.log('🔄 User 2 received messageDeleted event:', data);
        });

        // 3. Create a test message (via REST API)
        console.log('2. Creating a test message...');

        const messageResponse = await axios.post(`${API_BASE}/chats/create`, {
            participants: ['user2_id'], // Replace with actual user ID
            message: 'Test message for deletion'
        }, {
            headers: {
                'Authorization': `Bearer ${USER1_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });

        const roomId = messageResponse.data.data.roomId;
        const messageId = messageResponse.data.data.messageId;

        console.log(`✅ Message created: ${messageId} in room: ${roomId}`);

        // 4. Both users join the room
        socket1.emit('joinRoom', { roomId });
        socket2.emit('joinRoom', { roomId });

        // Wait a bit for connections
        await new Promise(resolve => setTimeout(resolve, 1000));

        // 5. Test REST API message deletion
        console.log('3. Testing REST API message deletion...');

        const deleteResponse = await axios.delete(`${API_BASE}/chats/message/${messageId}`, {
            headers: {
                'Authorization': `Bearer ${USER1_TOKEN}`
            }
        });

        console.log('✅ REST API deletion successful:', deleteResponse.data.message);

        // Wait for socket event
        await new Promise(resolve => setTimeout(resolve, 2000));

        // 6. Test Socket-based message deletion (create another message first)
        console.log('4. Testing Socket-based message deletion...');

        socket1.emit('sendMessage', {
            roomId: roomId,
            content: 'Another test message for socket deletion'
        });

        socket1.on('receiveMessage', (message) => {
            console.log('📨 New message received for socket test:', message._id);

            // Delete via socket
            setTimeout(() => {
                socket1.emit('deleteMessage', { messageId: message._id });
            }, 1000);
        });

        socket1.on('error', (error) => {
            console.error('❌ Socket error:', error);
        });

        console.log('5. Test complete! Check the logs above for real-time events.');

        // Cleanup
        setTimeout(() => {
            socket1.disconnect();
            socket2.disconnect();
            console.log('\n🧹 Cleaned up connections');
        }, 5000);

    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
    }
}

// Run the test
if (require.main === module) {
    console.log('⚠️  Before running this test:');
    console.log('1. Start your server');
    console.log('2. Replace USER1_TOKEN and USER2_TOKEN with actual JWT tokens');
    console.log('3. Replace user2_id with actual user ID');
    console.log('4. Ensure axios and socket.io-client are installed\n');

    // Uncomment the line below to run the test
    // testRealTimeMessageDeletion();
}

module.exports = { testRealTimeMessageDeletion };
