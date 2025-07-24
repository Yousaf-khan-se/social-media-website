# Settings API - Quick Reference Card

## 📋 Endpoints Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/settings` | Get all user settings |
| `GET` | `/api/settings/summary` | Get settings summary |
| `PUT` | `/api/settings` | Update multiple settings |
| `PUT` | `/api/settings/privacy` | Update privacy settings |
| `PUT` | `/api/settings/notifications` | Update notification settings |
| `PUT` | `/api/settings/security` | Update security settings |
| `PUT` | `/api/settings/chat` | Update chat settings |
| `PUT` | `/api/settings/content` | Update content settings |
| `PUT` | `/api/settings/accessibility` | Update accessibility settings |
| `PUT` | `/api/settings/preferences` | Update app preferences |
| `POST` | `/api/settings/block` | Block a user |
| `POST` | `/api/settings/unblock` | Unblock a user |
| `GET` | `/api/settings/blocked-users` | Get blocked users list |
| `POST` | `/api/settings/block-keyword` | Block a keyword |
| `POST` | `/api/settings/unblock-keyword` | Unblock a keyword |
| `POST` | `/api/settings/reset` | Reset settings to defaults |
| `GET` | `/api/settings/export` | Export settings as JSON |
| `POST` | `/api/settings/import` | Import settings from JSON |

## 🔑 Valid Values Reference

### Privacy Settings
- `profileVisibility`: `"public"` | `"followers"` | `"private"`
- `whoCanMessageMe`: `"everyone"` | `"followers"` | `"nobody"`
- `whoCanFollowMe`: `"everyone"` | `"manual_approval"`
- `whoCanSeeMyFollowers`: `"everyone"` | `"followers"` | `"private"`
- `whoCanSeeMyFollowing`: `"everyone"` | `"followers"` | `"private"`
- `defaultPostVisibility`: `"public"` | `"followers"` | `"private"`

### Chat Settings
- `autoDownloadImages`: `"never"` | `"wifi"` | `"always"`
- `autoDownloadVideos`: `"never"` | `"wifi"` | `"always"`
- `autoDownloadFiles`: `"never"` | `"wifi"` | `"always"`
- `autoDeleteMessages.duration`: `1-365` (days)

### Content Settings
- `contentFilter`: `"none"` | `"mild"` | `"strict"`
- `dateFormat`: `"MM/DD/YYYY"` | `"DD/MM/YYYY"` | `"YYYY-MM-DD"`

### Accessibility Settings
- `fontSize`: `"small"` | `"medium"` | `"large"` | `"extra-large"`

### App Preferences
- `theme`: `"light"` | `"dark"` | `"auto"`

### Reset Sections
- `section`: `"privacy"` | `"notifications"` | `"security"` | `"chat"` | `"content"` | `"accessibility"` | `"preferences"`

## 📤 Common Response Format

### Success Response
```json
{
    "success": true,
    "data": {
        // Response data here
    },
    "message": "Operation completed successfully"
}
```

### Error Response
```json
{
    "success": false,
    "error": "Error message here"
}
```

### Validation Error Response
```json
{
    "success": false,
    "error": "Validation failed",
    "details": [
        {
            "type": "field",
            "msg": "Error message",
            "path": "field_name",
            "location": "body"
        }
    ]
}
```

## 🚀 Quick Start Code

### Basic Settings Fetch
```javascript
const response = await fetch('/api/settings', {
    credentials: 'include'
});
const data = await response.json();
if (data.success) {
    console.log(data.data.settings);
}
```

### Update Notifications
```javascript
const response = await fetch('/api/settings/notifications', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
        pushNotifications: true,
        likes: false
    })
});
```

### Block User
```javascript
const response = await fetch('/api/settings/block', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
        targetUserId: "user_id_here",
        reason: "Spam"
    })
});
```

## 🔗 Full Documentation
See `SETTINGS_API_COMPLETE_GUIDE.md` for comprehensive documentation with examples, error handling, and best practices.
