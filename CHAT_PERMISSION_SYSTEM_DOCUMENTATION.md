# Chat Permission System Documentation

## Overview

The Chat Permission System provides granular control over who can initiate chats with users based on their privacy settings and follower relationships. This system prevents unwanted messages while maintaining user connectivity through a permission request mechanism.

## Features

### 1. Privacy-Based Chat Controls
- **Everyone**: Anyone can create a chat (default behavior)
- **Followers Only**: Only users who follow the recipient can create chats
- **Nobody**: No one can initiate new chats (except approved requests)

### 2. Permission Request System
- Users who don't meet the direct chat criteria can send permission requests
- Recipients receive notifications about chat requests
- Automatic chat creation upon approval
- Request expiration after 7 days

### 3. Notification Integration
- Real-time notifications for permission requests
- Approval/denial notifications to requesters
- Integration with existing FCM notification system

## Database Models

### ChatPermissionRequest Model
```javascript
{
  requester: ObjectId,      // User requesting chat permission
  recipient: ObjectId,      // User who can approve/deny
  status: String,           // 'pending', 'approved', 'denied'
  message: String,          // Optional message from requester
  chatData: {               // Original chat creation data
    participants: [ObjectId],
    isGroup: Boolean,
    name: String
  },
  respondedAt: Date,
  expiresAt: Date,          // Auto-expires after 7 days
  createdAt: Date,
  updatedAt: Date
}
```

### Updated Notification Types
- Added `chat_permission_request` to the notification enum
- Maps to the `messages` notification setting

## API Endpoints

### 1. Create Chat (Updated)
```
POST /api/chats/create
```

**Request Body:**
```json
{
  "participants": ["userId1", "userId2"],
  "isGroup": false,
  "name": "",
  "message": "Optional message for permission requests"
}
```

**Responses:**

**Direct Chat Creation (Permission Granted):**
```json
{
  "success": true,
  "chat": { /* chat object */ },
  "message": "Chat created successfully"
}
```

**Permission Request Sent:**
```json
{
  "success": true,
  "permissionRequest": { /* request object */ },
  "message": "Chat permission request sent. The user will be notified.",
  "requiresPermission": true
}
```

**Permission Denied:**
```json
{
  "success": false,
  "error": "User does not accept messages from anyone"
}
```

### 2. Get Permission Requests
```
GET /api/chats/permission-requests?type=received|sent
```

**Response:**
```json
{
  "success": true,
  "requests": [
    {
      "_id": "requestId",
      "requester": { /* user object */ },
      "recipient": { /* user object */ },
      "status": "pending",
      "message": "Hi! I would like to chat with you.",
      "createdAt": "2025-01-28T12:00:00Z"
    }
  ]
}
```

### 3. Respond to Permission Request
```
POST /api/chats/permission-requests/:requestId/respond
```

**Request Body:**
```json
{
  "response": "approved" // or "denied"
}
```

**Response (Approved):**
```json
{
  "success": true,
  "permissionRequest": { /* updated request */ },
  "chatRoom": { /* created chat */ },
  "message": "Chat permission request approved and chat created successfully"
}
```

## User Settings

Users can control who can message them through their privacy settings:

```javascript
// In Settings model
privacy: {
  whoCanMessageMe: {
    type: String,
    enum: ['everyone', 'followers', 'nobody'],
    default: 'everyone'
  }
}
```

## Permission Check Logic

### Decision Flow:

1. **Check Recipient Settings**
   - `everyone`: ✅ Allow immediate chat creation
   - `nobody`: ❌ Deny with no permission option
   - `followers`: Check follower relationship

2. **Follower Check** (for 'followers' setting)
   - Is requester following recipient?
   - ✅ Yes: Allow immediate chat creation
   - ❌ No: Require permission request

3. **Permission Request Process**
   - Create ChatPermissionRequest record
   - Send notification to recipient
   - Return permission request response

## Implementation Details

### Services Created:

1. **chatPermissionService.js**
   - `checkChatPermission(requesterId, recipientId)`
   - `createChatPermissionRequest(requesterId, recipientId, chatData, message)`
   - `respondToChatPermissionRequest(requestId, recipientId, response)`
   - `getChatPermissionRequests(userId, type)`

### Controller Updates:

1. **chatController.js**
   - Updated `createChat` function with permission checks
   - Added `getChatPermissionRequests` function
   - Added `respondToChatPermissionRequest` function

### Model Updates:

1. **Notification.js** - Added `chat_permission_request` type
2. **ChatPermissionRequest.js** - New model for managing requests

## Frontend Integration

### Chat Creation Flow:
```javascript
// Frontend chat creation
const response = await fetch('/api/chats/create', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: JSON.stringify({
    participants: [userId],
    message: "Hi! I'd like to chat with you."
  })
});

const data = await response.json();

if (data.requiresPermission) {
  // Show "Permission request sent" message
  showNotification('Permission request sent! The user will be notified.');
} else if (data.chat) {
  // Navigate to chat
  navigateToChat(data.chat._id);
}
```

### Permission Request Management:
```javascript
// Get pending requests
const requests = await fetch('/api/chats/permission-requests?type=received');

// Respond to request
const response = await fetch(`/api/chats/permission-requests/${requestId}/respond`, {
  method: 'POST',
  body: JSON.stringify({ response: 'approved' })
});
```

## Security Considerations

1. **Request Validation**: All requests validate user authentication and authorization
2. **Duplicate Prevention**: Unique index prevents multiple pending requests between same users
3. **Auto-Expiration**: Requests expire after 7 days to prevent accumulation
4. **Permission Verification**: Only request recipients can respond to their requests

## Performance Optimizations

1. **Indexes**: Efficient querying with compound indexes on recipient/status
2. **TTL Index**: Auto-cleanup of expired requests
3. **Populate Optimization**: Selective field population for user data
4. **Request Deduplication**: Prevents spam through unique constraints

## Testing

Use the provided `testChatPermissions.js` file to test the system:

```bash
node testChatPermissions.js
```

## Migration Notes

- No existing data migration required
- New ChatPermissionRequest collection will be created automatically
- Existing chat functionality remains unchanged
- Default setting allows everyone to message (backward compatible)

## Error Handling

The system provides clear error messages for various scenarios:
- User not found
- Invalid permissions
- Duplicate requests
- Request not found
- Unauthorized access

All errors follow the standard ResponseHandler pattern for consistent API responses.

## Troubleshooting

### Common Issues:

1. **`notificationService.createNotification is not a function`**
   - **Solution**: Ensure the `createNotification` function is exported from `notificationService.js`
   - **Fix Applied**: Added `createNotification` function to notification service exports

2. **Chat permission requests not creating**
   - Check that the user settings model has the `whoCanMessageMe` field
   - Verify the recipient user exists in the database
   - Ensure proper authentication token is provided

3. **Notifications not being sent**
   - Verify FCM tokens are properly configured
   - Check notification settings for the recipient user
   - Ensure Firebase configuration is correct

### Testing the Implementation:

```bash
# Test with curl (replace with actual user IDs and token)
curl -X POST http://localhost:4090/api/chats/create \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "participants": ["USER_ID_HERE"],
    "message": "Hi! I would like to chat with you."
  }'
```
