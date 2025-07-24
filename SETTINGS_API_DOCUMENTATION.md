# Settings API Documentation

## Overview
The Settings API provides comprehensive user preference management for the social media platform, covering privacy, notifications, security, chat, content, accessibility, and app preferences.

**Important:** All notification settings have been moved from the User model to the Settings model. The old `/api/notifications/settings` endpoints have been removed - use `/api/settings/notifications` instead.

## Base URL
All settings endpoints are prefixed w### Integration with Existing Features

### Notifications
- **Settings Location**: All notification preferences are now in Settings model only
- **Backward Compatibility**: Legacy User model notification settings have been removed
- **Real-time Updates**: Notification services now read from Settings model
- **Quiet Hours**: Respect user timezone and Settings model preferences
- **Granular Control**: Individual toggles for all notification types in Settingsapi/settings`

## Authentication
All endpoints require authentication via JWT token in cookies or Authorization header.

---

## Migration from Legacy Notification Settings

### Important Changes
- **Removed:** `/api/notifications/settings` (GET and PUT)
- **Replaced with:** `/api/settings/notifications` (PUT) and `/api/settings` (GET)
- **User Model:** `notificationSettings` field has been removed from User model
- **Settings Model:** All notification preferences are now in Settings model under `notifications`

### Frontend Migration Guide
```javascript
// OLD - Don't use these anymore
GET /api/notifications/settings
PUT /api/notifications/settings

// NEW - Use these instead
GET /api/settings (includes notifications section)
PUT /api/settings/notifications
```

---

## Endpoints

### 1. Get All Settings
```http
GET /api/settings
```

**Response:**
```json
{
  "success": true,
  "data": {
    "settings": {
      "privacy": {
        "profileVisibility": "public",
        "showLastSeen": true,
        "showOnlineStatus": true,
        "defaultPostVisibility": "public",
        "allowPostSharing": true,
        "whoCanMessageMe": "everyone",
        "whoCanFollowMe": "everyone",
        "whoCanSeeMyFollowers": "everyone",
        "whoCanSeeMyFollowing": "everyone",
        "allowSearchByEmail": false,
        "allowSearchByUsername": true,
        "showInSuggestions": true
      },
      "notifications": {
        "pushNotifications": true,
        "likes": true,
        "comments": true,
        "shares": true,
        "follows": true,
        "followerRequests": true,
        "messages": true,
        "groupChats": true,
        "messagePreview": true,
        "emailNotifications": false,
        "weeklyDigest": false,
        "quietHours": {
          "enabled": false,
          "startTime": "22:00",
          "endTime": "08:00"
        }
      },
      "security": {
        "twoFactorEnabled": false,
        "loginAlerts": true,
        "logoutOtherDevices": false,
        "passwordLastChanged": "2025-07-23T10:00:00.000Z",
        "securityQuestionSet": false
      },
      "chat": {
        "readReceipts": true,
        "typingIndicators": true,
        "lastSeenInGroups": true,
        "autoDownloadImages": "wifi",
        "autoDownloadVideos": "never",
        "autoDownloadFiles": "never",
        "autoDeleteMessages": {
          "enabled": false,
          "duration": 30
        },
        "backupChats": false
      },
      "content": {
        "highQualityUploads": true,
        "compressImages": false,
        "contentFilter": "mild",
        "hideOffensiveContent": true,
        "language": "en",
        "timezone": "UTC",
        "dateFormat": "MM/DD/YYYY"
      },
      "accessibility": {
        "fontSize": "medium",
        "highContrast": false,
        "reducedMotion": false,
        "screenReader": false
      },
      "preferences": {
        "theme": "light",
        "autoPlayVideos": true,
        "soundEnabled": true,
        "hapticFeedback": true
      },
      "blocked": {
        "users": [],
        "keywords": []
      }
    }
  },
  "message": "Settings retrieved successfully"
}
```

### 2. Get Settings Summary
```http
GET /api/settings/summary
```

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "privacy": {
        "profileVisibility": "public",
        "whoCanMessageMe": "everyone",
        "whoCanFollowMe": "everyone"
      },
      "notifications": {
        "pushNotifications": true,
        "emailNotifications": false,
        "quietHours": {
          "enabled": false,
          "startTime": "22:00",
          "endTime": "08:00"
        }
      },
      "security": {
        "twoFactorEnabled": false,
        "loginAlerts": true,
        "passwordLastChanged": "2025-07-23T10:00:00.000Z"
      },
      "blocked": {
        "usersCount": 0,
        "keywordsCount": 0
      },
      "preferences": {
        "theme": "light",
        "language": "en"
      }
    }
  },
  "message": "Settings summary retrieved successfully"
}
```

### 3. Update All Settings
```http
PUT /api/settings
```

**Request Body:**
```json
{
  "privacy": {
    "profileVisibility": "followers",
    "showLastSeen": false
  },
  "notifications": {
    "pushNotifications": true,
    "emailNotifications": true
  },
  "preferences": {
    "theme": "dark"
  }
}
```

### 4. Update Privacy Settings
```http
PUT /api/settings/privacy
```

**Request Body:**
```json
{
  "profileVisibility": "followers",
  "showLastSeen": false,
  "whoCanMessageMe": "followers",
  "allowSearchByEmail": false
}
```

**Valid Values:**
- `profileVisibility`: `"public"`, `"followers"`, `"private"`
- `whoCanMessageMe`: `"everyone"`, `"followers"`, `"nobody"`
- `whoCanFollowMe`: `"everyone"`, `"manual_approval"`
- `whoCanSeeMyFollowers/Following`: `"everyone"`, `"followers"`, `"private"`
- `defaultPostVisibility`: `"public"`, `"followers"`, `"private"`

### 5. Update Notification Settings
```http
PUT /api/settings/notifications
```

**Request Body:**
```json
{
  "pushNotifications": true,
  "likes": true,
  "comments": false,
  "emailNotifications": true,
  "quietHours": {
    "enabled": true,
    "startTime": "23:00",
    "endTime": "07:00"
  }
}
```

### 6. Update Security Settings
```http
PUT /api/settings/security
```

**Request Body:**
```json
{
  "twoFactorEnabled": true,
  "loginAlerts": true,
  "logoutOtherDevices": false
}
```

### 7. Update Chat Settings
```http
PUT /api/settings/chat
```

**Request Body:**
```json
{
  "readReceipts": false,
  "typingIndicators": true,
  "autoDownloadImages": "always",
  "autoDeleteMessages": {
    "enabled": true,
    "duration": 7
  }
}
```

**Valid Values:**
- `autoDownloadImages/Videos/Files`: `"never"`, `"wifi"`, `"always"`
- `autoDeleteMessages.duration`: 1-365 days

### 8. Update Content Settings
```http
PUT /api/settings/content
```

**Request Body:**
```json
{
  "language": "es",
  "timezone": "America/New_York",
  "contentFilter": "strict",
  "dateFormat": "DD/MM/YYYY"
}
```

**Valid Values:**
- `contentFilter`: `"none"`, `"mild"`, `"strict"`
- `dateFormat`: `"MM/DD/YYYY"`, `"DD/MM/YYYY"`, `"YYYY-MM-DD"`

### 9. Update Accessibility Settings
```http
PUT /api/settings/accessibility
```

**Request Body:**
```json
{
  "fontSize": "large",
  "highContrast": true,
  "reducedMotion": true
}
```

**Valid Values:**
- `fontSize`: `"small"`, `"medium"`, `"large"`, `"extra-large"`

### 10. Update App Preferences
```http
PUT /api/settings/preferences
```

**Request Body:**
```json
{
  "theme": "dark",
  "autoPlayVideos": false,
  "soundEnabled": true
}
```

**Valid Values:**
- `theme`: `"light"`, `"dark"`, `"auto"`

### 11. Block User
```http
POST /api/settings/block
```

**Request Body:**
```json
{
  "targetUserId": "507f1f77bcf86cd799439011",
  "reason": "Inappropriate behavior"
}
```

### 12. Unblock User
```http
POST /api/settings/unblock
```

**Request Body:**
```json
{
  "targetUserId": "507f1f77bcf86cd799439011"
}
```

### 13. Get Blocked Users
```http
GET /api/settings/blocked-users?page=1&limit=20
```

**Response:**
```json
{
  "success": true,
  "data": {
    "blockedUsers": [
      {
        "user": {
          "_id": "507f1f77bcf86cd799439011",
          "username": "blockeduser",
          "firstName": "John",
          "lastName": "Doe",
          "profilePicture": "https://..."
        },
        "blockedAt": "2025-07-23T10:00:00.000Z",
        "reason": "Inappropriate behavior"
      }
    ],
    "totalCount": 1,
    "currentPage": 1,
    "totalPages": 1
  }
}
```

### 14. Block Keyword
```http
POST /api/settings/block-keyword
```

**Request Body:**
```json
{
  "keyword": "spam"
}
```

### 15. Unblock Keyword
```http
POST /api/settings/unblock-keyword
```

**Request Body:**
```json
{
  "keyword": "spam"
}
```

### 16. Reset Settings
```http
POST /api/settings/reset
```

**Request Body (optional):**
```json
{
  "section": "privacy"
}
```

**Valid sections:** `"privacy"`, `"notifications"`, `"security"`, `"chat"`, `"content"`, `"accessibility"`, `"preferences"`

If no section is provided, all settings are reset to defaults.

### 17. Export Settings
```http
GET /api/settings/export
```

**Response:** Downloads a JSON file containing all user settings (excluding sensitive data).

### 18. Import Settings
```http
POST /api/settings/import
```

**Request Body:** JSON object with settings data to import.

---

## Privacy Features

### Content Filtering
- **Blocked Users**: Content from blocked users is automatically filtered from feeds, search results, and notifications
- **Blocked Keywords**: Posts and messages containing blocked keywords are hidden
- **Profile Visibility**: Control who can see your profile and posts

### Messaging Privacy
- **Message Permissions**: Control who can send you messages
- **Online Status**: Hide your online status and last seen
- **Read Receipts**: Disable read receipts in chats

### Search Privacy
- **Email Search**: Control if others can find you by email
- **Username Search**: Control if others can find you by username
- **Suggestions**: Control if you appear in friend suggestions

---

## Security Features

### Two-Factor Authentication
- Enable/disable 2FA for account security
- Backup codes management (generated server-side)

### Login Security
- Login alerts for new device access
- Option to logout all other devices
- Password change tracking

---

## Chat Features

### Message Management
- Read receipts control
- Typing indicators control
- Auto-delete messages with configurable duration
- Last seen visibility in groups

### Media Auto-Download
- Separate settings for images, videos, and files
- Options: never, WiFi only, always
- Helps manage data usage

### Chat Backup
- Option to backup chat history
- Useful for data export/import

---

## Accessibility Features

### Visual Accessibility
- Font size options (small to extra-large)
- High contrast mode
- Reduced motion for users with vestibular disorders

### Screen Reader Support
- Screen reader optimization mode
- Better semantic markup when enabled

---

## Integration with Existing Features

### Notifications
- Settings sync with User model for backward compatibility
- Quiet hours respect user timezone
- Granular control over notification types

### Posts
- Default post visibility setting
- Content filtering for blocked users/keywords
- Post sharing permissions

### Chat System
- Privacy settings affect who can message
- Blocked users cannot send messages
- Read receipts and typing indicators respect settings

### Socket.IO Integration
- Online status respects privacy settings
- Message delivery considers notification preferences
- Real-time updates for settings changes

---

## Error Responses

### Validation Error (400)
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "field": "profileVisibility",
      "message": "Profile visibility must be public, followers, or private"
    }
  ]
}
```

### Unauthorized (401)
```json
{
  "success": false,
  "error": "Authentication required"
}
```

### Not Found (404)
```json
{
  "success": false,
  "error": "User not found"
}
```

### Internal Server Error (500)
```json
{
  "success": false,
  "error": "Failed to update settings"
}
```

---

## Best Practices

### Frontend Implementation
1. **Cache Settings**: Store settings locally and sync periodically
2. **Optimistic Updates**: Update UI immediately, handle errors gracefully
3. **Granular Updates**: Use specific endpoints instead of updating all settings
4. **Validation**: Validate settings client-side before sending

### Privacy Considerations
1. **Default Privacy**: Use privacy-friendly defaults
2. **User Education**: Explain privacy implications clearly
3. **Data Minimization**: Only collect necessary preference data
4. **Export/Import**: Allow users to backup their settings

### Performance Optimization
1. **Lazy Loading**: Load settings sections as needed
2. **Caching**: Cache frequently accessed settings
3. **Batch Updates**: Group related setting changes
4. **Middleware**: Use content filtering middleware efficiently

---

## Testing

### Unit Tests
- Test each settings validation rule
- Test privacy permission checks
- Test content filtering logic

### Integration Tests
- Test settings sync with existing features
- Test privacy enforcement across endpoints
- Test notification preference handling

### User Experience Tests
- Test settings import/export functionality
- Test reset to defaults behavior
- Test edge cases for quiet hours and time zones
