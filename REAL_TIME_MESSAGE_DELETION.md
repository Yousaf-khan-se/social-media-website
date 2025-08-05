# Real-time Message Deletion Implementation

## Problem Description
Previously, when a user deleted a message via the REST API, other users in the chat room would not see the deletion in real-time. They had to refresh the chat to see the updated state.

## Solution Overview
Implemented real-time socket emission for message deletions that notifies all users in the chat room immediately when a message is deleted.

## Architecture Changes

### 1. Controller Layer (`chatController.js`)
- Enhanced `deleteMessage` function to emit socket events after successful deletion
- Added Socket.IO instance access via `req.app.get('io')`
- Emits `messageDeleted` event to all users in the chat room

### 2. Service Layer (`chatService.js`)
- Modified `deleteMessage` function to return socket data for emission
- Added `socketData` object containing:
  - `roomId`: Chat room ID for targeted emission
  - `messageUpdate`: Updated message content for sender deletions
  - `isCompletelyDeleted`: Flag for complete message removal

### 3. Socket Handler (`chatSocket.js`)
- Added `deleteMessage` socket event handler for alternative deletion method
- Provides both REST API and WebSocket deletion capabilities

### 4. App Configuration (`app.js`)
- Made Socket.IO instance accessible to Express app via `server.set('io', io)`

## Message Deletion Flow

### Soft Delete (Receiver deletes message)
1. User calls DELETE `/chats/message/:messageId`
2. Message added to user's `deletedFor` array
3. Socket event `messageDeleted` emitted with:
   ```javascript
   {
     messageId: "message_id",
     deletedBy: "user_id", 
     messageUpdate: null,
     isCompletelyDeleted: false
   }
   ```
4. Other users receive event and hide message for that user only

### Sender Delete (Content modification)
1. Sender calls DELETE `/chats/message/:messageId`
2. Message content changed to "deleted by owner"
3. Media files deleted from Cloudinary
4. Socket event `messageDeleted` emitted with:
   ```javascript
   {
     messageId: "message_id",
     deletedBy: "sender_id",
     messageUpdate: {
       _id: "message_id",
       content: "deleted by owner",
       messageType: "text",
       // ... other updated fields
     },
     isCompletelyDeleted: false
   }
   ```
5. All users see updated message content

### Complete Delete (All participants deleted)
1. When all participants have deleted the message
2. Message completely removed from database
3. Socket event `messageDeleted` emitted with:
   ```javascript
   {
     messageId: "message_id", 
     deletedBy: "last_user_id",
     messageUpdate: null,
     isCompletelyDeleted: true
   }
   ```
4. Message removed from all users' views

## Socket Events

### Emitted Events
- `messageDeleted`: Notifies all room participants of message deletion

### Listened Events  
- `deleteMessage`: Alternative to REST API for message deletion

## Frontend Integration Guide

### Listening for Message Deletions
```javascript
socket.on('messageDeleted', (data) => {
  const { messageId, deletedBy, messageUpdate, isCompletelyDeleted } = data;
  
  if (isCompletelyDeleted) {
    // Remove message completely from UI
    removeMessageFromUI(messageId);
  } else if (messageUpdate) {
    // Update message content (sender deletion)
    updateMessageInUI(messageId, messageUpdate);
  } else {
    // Hide message for specific user (soft delete)
    hideMessageForUser(messageId, deletedBy);
  }
});
```

### Alternative Socket-based Deletion
```javascript
// Instead of REST API call
socket.emit('deleteMessage', { messageId: 'message_id' });

// Handle errors
socket.on('error', (error) => {
  if (error.action === 'deleteMessage') {
    console.error('Delete failed:', error.message);
  }
});
```

## Benefits

1. **Real-time Updates**: Users see message deletions immediately
2. **Consistent State**: All connected users have synchronized chat state  
3. **Better UX**: No need to refresh to see deletions
4. **Dual Methods**: Both REST API and WebSocket deletion supported
5. **Error Handling**: Proper error emission for failed deletions

## Testing Scenarios

1. **Sender deletes message**: All users should see "deleted by owner"
2. **Receiver deletes message**: Message hidden only for that user
3. **All participants delete**: Message completely removed for everyone
4. **Offline users**: Will see correct state when they reconnect
5. **Socket vs REST**: Both methods should produce same results
