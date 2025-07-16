# Chat API Documentation

This document describes the chat functionality endpoints for the Social Media Platform backend.

## Base URL
All chat endpoints are prefixed with `/api/chats`

## Authentication
All chat endpoints require authentication. Include the JWT token in the `Authorization` header or as a cookie.

## HTTP Endpoints

### 1. Create Chat Room
**POST** `/api/chats/create`

Creates a new chat room (one-on-one or group chat).

**Request Body:**
```json
{
  "participants": ["userId1", "userId2"],
  "isGroup": false,
  "name": "Chat Name" // Required only for group chats
}
```

**Response:**
```json
{
  "success": true,
  "chat": {
    "_id": "chatRoomId",
    "participants": [...],
    "isGroup": false,
    "name": "",
    "lastMessage": null,
    "createdAt": "2025-01-16T...",
    "updatedAt": "2025-01-16T..."
  },
  "message": "Chat created successfully"
}
```

### 2. Get All User Chats
**GET** `/api/chats/`

Retrieves all chat rooms where the authenticated user is a participant.

**Response:**
```json
{
  "success": true,
  "chats": [
    {
      "_id": "chatRoomId",
      "participants": [...],
      "isGroup": false,
      "name": "",
      "lastMessage": {...},
      "createdAt": "2025-01-16T...",
      "updatedAt": "2025-01-16T..."
    }
  ],
  "message": "Chats fetched successfully"
}
```

### 3. Get Chat Messages
**GET** `/api/chats/:roomId/messages?page=1&limit=50`

Retrieves messages from a specific chat room with pagination.

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Number of messages per page (default: 50, max: 100)

**Response:**
```json
{
  "success": true,
  "chat": {
    "_id": "chatRoomId",
    "participants": [...],
    "isGroup": false,
    "name": ""
  },
  "messages": [
    {
      "_id": "messageId",
      "chatRoom": "chatRoomId",
      "sender": {...},
      "content": "Message content",
      "messageType": "text",
      "caption": "",
      "seenBy": [...],
      "createdAt": "2025-01-16T...",
      "updatedAt": "2025-01-16T..."
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalMessages": 250,
    "hasMore": true
  },
  "message": "Chat messages fetched successfully"
}
```

### 4. Upload Media to Chat
**PUT** `/api/chats/media/:roomId`

Uploads media files to a chat room.

**Request:** 
- Content-Type: `multipart/form-data`
- Form field: `media` (array of files, max 10 files)

**Response:**
```json
{
  "success": true,
  "mediaUrls": [
    {
      "secure_url": "https://cloudinary.com/...",
      "public_id": "...",
      "resource_type": "image",
      "format": "jpg",
      "width": 1920,
      "height": 1080,
      "bytes": 524288,
      "responsive_urls": {...}
    }
  ],
  "message": "Successfully uploaded 1 media file(s)",
  "optimization_applied": true
}
```

### 5. Delete Chat Room
**DELETE** `/api/chats/:roomId`

Deletes a chat room and all its messages.

**Response:**
```json
{
  "success": true,
  "message": "Chat deleted successfully"
}
```

### 6. Delete Message
**DELETE** `/api/chats/message/:messageId`

Deletes a specific message from a chat room.

**Response:**
```json
{
  "success": true,
  "message": "Message deleted successfully"
}
```

## WebSocket Events

### Connection
Connect to the WebSocket server with authentication cookie.

### Events to Send

#### 1. Join Room
```javascript
socket.emit('joinRoom', { roomId: 'chatRoomId' });
```

#### 2. Leave Room
```javascript
socket.emit('leaveRoom', { roomId: 'chatRoomId' });
```

#### 3. Send Message
```javascript
socket.emit('sendMessage', {
  roomId: 'chatRoomId',
  content: 'Message content',
  messageType: 'text', // 'text', 'image', 'video', 'file'
  caption: 'Optional caption for media'
});
```

#### 4. Typing Indicator
```javascript
socket.emit('typing', { roomId: 'chatRoomId', isTyping: true });
```

#### 5. Mark Message as Seen
```javascript
socket.emit('markAsSeen', { messageId: 'messageId' });
```

### Events to Listen For

#### 1. Receive Message
```javascript
socket.on('receiveMessage', (message) => {
  // Handle new message
});
```

#### 2. User Joined
```javascript
socket.on('userJoined', (data) => {
  // Handle user joining room
});
```

#### 3. User Left
```javascript
socket.on('userLeft', (data) => {
  // Handle user leaving room
});
```

#### 4. User Typing
```javascript
socket.on('userTyping', (data) => {
  // Handle typing indicator
});
```

#### 5. Message Seen
```javascript
socket.on('messageSeen', (data) => {
  // Handle message read receipt
});
```

#### 6. Error
```javascript
socket.on('error', (error) => {
  // Handle socket errors
});
```

## Error Responses

All endpoints follow the same error response format:

```json
{
  "success": false,
  "error": "Error message",
  "timestamp": "2025-01-16T...",
  "details": "Additional error details (optional)"
}
```

## Status Codes

- `200`: Success
- `201`: Created
- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `500`: Internal Server Error

## File Upload Limitations

- Maximum file size: 10MB for images, 100MB for videos
- Maximum files per upload: 10
- Supported image formats: JPEG, JPG, PNG, WebP, AVIF
- Supported video formats: MP4, WebM, MOV, AVI

## Notes

- All dates are in ISO 8601 format
- User IDs must be valid MongoDB ObjectIDs
- Media files are automatically optimized and multiple formats are generated
- WebSocket connections require authentication via cookies
- Messages are paginated with newest messages first
