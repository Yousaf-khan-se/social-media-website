# Settings API - Complete Frontend Developer Guide

## 📋 Overview

The Settings API provides comprehensive user preference management for the social media platform. This API consolidates all user settings including privacy, notifications, security, chat preferences, content filters, accessibility options, and app preferences.

**Base URL:** `/api/settings`

**Authentication:** All endpoints require JWT authentication via cookies or Authorization header.

---

## 🔐 Authentication

All Settings API endpoints require user authentication. Include one of the following:

```javascript
// Option 1: Using cookies (automatic if set)
fetch('/api/settings', {
    credentials: 'include'
});

// Option 2: Using Authorization header
fetch('/api/settings', {
    headers: {
        'Authorization': `Bearer ${token}`
    }
});
```

---

## 📚 API Endpoints Reference

### 1. Get All User Settings

**Endpoint:** `GET /api/settings`

**Description:** Retrieves all user settings including privacy, notifications, security, chat, content, accessibility, preferences, and blocked content.

**Request:**
```javascript
fetch('/api/settings', {
    method: 'GET',
    credentials: 'include'
});
```

**Success Response (200):**
```json
{
    "success": true,
    "data": {
        "settings": {
            "user": "user_id_here",
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
                "passwordLastChanged": "2025-01-20T10:00:00.000Z",
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
            },
            "createdAt": "2025-01-20T10:00:00.000Z",
            "updatedAt": "2025-01-20T10:00:00.000Z"
        }
    },
    "message": "Settings retrieved successfully"
}
```

**Error Response (401):**
```json
{
    "success": false,
    "error": "Authentication required"
}
```

**Error Response (500):**
```json
{
    "success": false,
    "error": "Failed to retrieve settings"
}
```

---

### 2. Get Settings Summary

**Endpoint:** `GET /api/settings/summary`

**Description:** Retrieves a condensed overview of key settings for dashboard display.

**Request:**
```javascript
fetch('/api/settings/summary', {
    method: 'GET',
    credentials: 'include'
});
```

**Success Response (200):**
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
                "passwordLastChanged": "2025-01-20T10:00:00.000Z"
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

---

### 3. Update All Settings

**Endpoint:** `PUT /api/settings`

**Description:** Update multiple settings sections at once.

**Request:**
```javascript
fetch('/api/settings', {
    method: 'PUT',
    headers: {
        'Content-Type': 'application/json'
    },
    credentials: 'include',
    body: JSON.stringify({
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
    })
});
```

**Success Response (200):**
```json
{
    "success": true,
    "data": {
        "settings": {
            // Complete updated settings object
        }
    },
    "message": "Settings updated successfully"
}
```

**Validation Error (400):**
```json
{
    "success": false,
    "error": "Validation failed",
    "details": [
        {
            "type": "field",
            "msg": "Privacy must be an object",
            "path": "privacy",
            "location": "body"
        }
    ]
}
```

---

### 4. Update Privacy Settings

**Endpoint:** `PUT /api/settings/privacy`

**Description:** Update privacy and visibility settings.

**Valid Values:**
- `profileVisibility`: `"public"`, `"followers"`, `"private"`
- `whoCanMessageMe`: `"everyone"`, `"followers"`, `"nobody"`
- `whoCanFollowMe`: `"everyone"`, `"manual_approval"`
- `whoCanSeeMyFollowers/Following`: `"everyone"`, `"followers"`, `"private"`
- `defaultPostVisibility`: `"public"`, `"followers"`, `"private"`

**Request:**
```javascript
fetch('/api/settings/privacy', {
    method: 'PUT',
    headers: {
        'Content-Type': 'application/json'
    },
    credentials: 'include',
    body: JSON.stringify({
        "profileVisibility": "followers",
        "showLastSeen": false,
        "whoCanMessageMe": "followers",
        "allowSearchByEmail": false
    })
});
```

**Success Response (200):**
```json
{
    "success": true,
    "data": {
        "privacy": {
            "profileVisibility": "followers",
            "showLastSeen": false,
            "showOnlineStatus": true,
            "defaultPostVisibility": "public",
            "allowPostSharing": true,
            "whoCanMessageMe": "followers",
            "whoCanFollowMe": "everyone",
            "whoCanSeeMyFollowers": "everyone",
            "whoCanSeeMyFollowing": "everyone",
            "allowSearchByEmail": false,
            "allowSearchByUsername": true,
            "showInSuggestions": true
        }
    },
    "message": "Privacy settings updated successfully"
}
```

**Validation Error (400):**
```json
{
    "success": false,
    "error": "Validation failed",
    "details": [
        {
            "type": "field",
            "msg": "Invalid profile visibility",
            "path": "profileVisibility",
            "location": "body"
        }
    ]
}
```

---

### 5. Update Notification Settings

**Endpoint:** `PUT /api/settings/notifications`

**Description:** Update notification preferences including push notifications, email notifications, and quiet hours.

**Request:**
```javascript
fetch('/api/settings/notifications', {
    method: 'PUT',
    headers: {
        'Content-Type': 'application/json'
    },
    credentials: 'include',
    body: JSON.stringify({
        "pushNotifications": true,
        "likes": true,
        "comments": false,
        "emailNotifications": true,
        "quietHours": {
            "enabled": true,
            "startTime": "23:00",
            "endTime": "07:00"
        }
    })
});
```

**Success Response (200):**
```json
{
    "success": true,
    "data": {
        "notifications": {
            "pushNotifications": true,
            "likes": true,
            "comments": false,
            "shares": true,
            "follows": true,
            "followerRequests": true,
            "messages": true,
            "groupChats": true,
            "messagePreview": true,
            "emailNotifications": true,
            "weeklyDigest": false,
            "quietHours": {
                "enabled": true,
                "startTime": "23:00",
                "endTime": "07:00"
            }
        }
    },
    "message": "Notification settings updated successfully"
}
```

**Validation Error (400):**
```json
{
    "success": false,
    "error": "Validation failed",
    "details": [
        {
            "type": "field",
            "msg": "Invalid start time format",
            "path": "quietHours.startTime",
            "location": "body"
        }
    ]
}
```

---

### 6. Update Security Settings

**Endpoint:** `PUT /api/settings/security`

**Description:** Update security-related settings.

**Note:** `backupCodes` and `passwordLastChanged` cannot be updated through this endpoint for security reasons.

**Request:**
```javascript
fetch('/api/settings/security', {
    method: 'PUT',
    headers: {
        'Content-Type': 'application/json'
    },
    credentials: 'include',
    body: JSON.stringify({
        "twoFactorEnabled": true,
        "loginAlerts": true,
        "logoutOtherDevices": false
    })
});
```

**Success Response (200):**
```json
{
    "success": true,
    "data": {
        "security": {
            "twoFactorEnabled": true,
            "loginAlerts": true,
            "logoutOtherDevices": false,
            "passwordLastChanged": "2025-01-20T10:00:00.000Z",
            "securityQuestionSet": false
        }
    },
    "message": "Security settings updated successfully"
}
```

---

### 7. Update Chat Settings

**Endpoint:** `PUT /api/settings/chat`

**Description:** Update chat and messaging preferences.

**Valid Values:**
- `autoDownloadImages/Videos/Files`: `"never"`, `"wifi"`, `"always"`
- `autoDeleteMessages.duration`: 1-365 days

**Request:**
```javascript
fetch('/api/settings/chat', {
    method: 'PUT',
    headers: {
        'Content-Type': 'application/json'
    },
    credentials: 'include',
    body: JSON.stringify({
        "readReceipts": false,
        "typingIndicators": true,
        "autoDownloadImages": "always",
        "autoDeleteMessages": {
            "enabled": true,
            "duration": 7
        }
    })
});
```

**Success Response (200):**
```json
{
    "success": true,
    "data": {
        "chat": {
            "readReceipts": false,
            "typingIndicators": true,
            "lastSeenInGroups": true,
            "autoDownloadImages": "always",
            "autoDownloadVideos": "never",
            "autoDownloadFiles": "never",
            "autoDeleteMessages": {
                "enabled": true,
                "duration": 7
            },
            "backupChats": false
        }
    },
    "message": "Chat settings updated successfully"
}
```

---

### 8. Update Content Settings

**Endpoint:** `PUT /api/settings/content`

**Description:** Update content filtering and localization settings.

**Valid Values:**
- `contentFilter`: `"none"`, `"mild"`, `"strict"`
- `dateFormat`: `"MM/DD/YYYY"`, `"DD/MM/YYYY"`, `"YYYY-MM-DD"`

**Request:**
```javascript
fetch('/api/settings/content', {
    method: 'PUT',
    headers: {
        'Content-Type': 'application/json'
    },
    credentials: 'include',
    body: JSON.stringify({
        "language": "es",
        "timezone": "America/New_York",
        "contentFilter": "strict",
        "dateFormat": "DD/MM/YYYY"
    })
});
```

**Success Response (200):**
```json
{
    "success": true,
    "data": {
        "content": {
            "highQualityUploads": true,
            "compressImages": false,
            "contentFilter": "strict",
            "hideOffensiveContent": true,
            "language": "es",
            "timezone": "America/New_York",
            "dateFormat": "DD/MM/YYYY"
        }
    },
    "message": "Content settings updated successfully"
}
```

---

### 9. Update Accessibility Settings

**Endpoint:** `PUT /api/settings/accessibility`

**Description:** Update accessibility and visual preference settings.

**Valid Values:**
- `fontSize`: `"small"`, `"medium"`, `"large"`, `"extra-large"`

**Request:**
```javascript
fetch('/api/settings/accessibility', {
    method: 'PUT',
    headers: {
        'Content-Type': 'application/json'
    },
    credentials: 'include',
    body: JSON.stringify({
        "fontSize": "large",
        "highContrast": true,
        "reducedMotion": true
    })
});
```

**Success Response (200):**
```json
{
    "success": true,
    "data": {
        "accessibility": {
            "fontSize": "large",
            "highContrast": true,
            "reducedMotion": true,
            "screenReader": false
        }
    },
    "message": "Accessibility settings updated successfully"
}
```

---

### 10. Update App Preferences

**Endpoint:** `PUT /api/settings/preferences`

**Description:** Update app theme and behavior preferences.

**Valid Values:**
- `theme`: `"light"`, `"dark"`, `"auto"`

**Request:**
```javascript
fetch('/api/settings/preferences', {
    method: 'PUT',
    headers: {
        'Content-Type': 'application/json'
    },
    credentials: 'include',
    body: JSON.stringify({
        "theme": "dark",
        "autoPlayVideos": false,
        "soundEnabled": true
    })
});
```

**Success Response (200):**
```json
{
    "success": true,
    "data": {
        "preferences": {
            "theme": "dark",
            "autoPlayVideos": false,
            "soundEnabled": true,
            "hapticFeedback": true
        }
    },
    "message": "Preferences updated successfully"
}
```

---

### 11. Block User

**Endpoint:** `POST /api/settings/block`

**Description:** Block a user and automatically unfollow them.

**Request:**
```javascript
fetch('/api/settings/block', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    credentials: 'include',
    body: JSON.stringify({
        "targetUserId": "507f1f77bcf86cd799439011",
        "reason": "Inappropriate behavior"
    })
});
```

**Success Response (200):**
```json
{
    "success": true,
    "data": {
        "message": "User blocked successfully"
    },
    "message": "User blocked successfully"
}
```

**Error Response (400):**
```json
{
    "success": false,
    "error": "Cannot block yourself"
}
```

**Error Response (404):**
```json
{
    "success": false,
    "error": "User not found"
}
```

---

### 12. Unblock User

**Endpoint:** `POST /api/settings/unblock`

**Description:** Unblock a previously blocked user.

**Request:**
```javascript
fetch('/api/settings/unblock', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    credentials: 'include',
    body: JSON.stringify({
        "targetUserId": "507f1f77bcf86cd799439011"
    })
});
```

**Success Response (200):**
```json
{
    "success": true,
    "data": {
        "message": "User unblocked successfully"
    },
    "message": "User unblocked successfully"
}
```

---

### 13. Get Blocked Users

**Endpoint:** `GET /api/settings/blocked-users`

**Description:** Get a paginated list of blocked users.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)

**Request:**
```javascript
fetch('/api/settings/blocked-users?page=1&limit=20', {
    method: 'GET',
    credentials: 'include'
});
```

**Success Response (200):**
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
                "blockedAt": "2025-01-20T10:00:00.000Z",
                "reason": "Inappropriate behavior"
            }
        ],
        "totalCount": 1,
        "currentPage": 1,
        "totalPages": 1
    },
    "message": "Blocked users retrieved successfully"
}
```

---

### 14. Block Keyword

**Endpoint:** `POST /api/settings/block-keyword`

**Description:** Add a keyword to the blocked list for content filtering.

**Request:**
```javascript
fetch('/api/settings/block-keyword', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    credentials: 'include',
    body: JSON.stringify({
        "keyword": "spam"
    })
});
```

**Success Response (200):**
```json
{
    "success": true,
    "data": {
        "message": "Keyword blocked successfully"
    },
    "message": "Keyword blocked successfully"
}
```

**Error Response (400):**
```json
{
    "success": false,
    "error": "Keyword is required and cannot be empty"
}
```

---

### 15. Unblock Keyword

**Endpoint:** `POST /api/settings/unblock-keyword`

**Description:** Remove a keyword from the blocked list.

**Request:**
```javascript
fetch('/api/settings/unblock-keyword', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    credentials: 'include',
    body: JSON.stringify({
        "keyword": "spam"
    })
});
```

**Success Response (200):**
```json
{
    "success": true,
    "data": {
        "message": "Keyword unblocked successfully"
    },
    "message": "Keyword unblocked successfully"
}
```

---

### 16. Reset Settings

**Endpoint:** `POST /api/settings/reset`

**Description:** Reset settings to default values. Can reset a specific section or all settings.

**Valid Sections:** `"privacy"`, `"notifications"`, `"security"`, `"chat"`, `"content"`, `"accessibility"`, `"preferences"`

**Request (Reset specific section):**
```javascript
fetch('/api/settings/reset', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    credentials: 'include',
    body: JSON.stringify({
        "section": "privacy"
    })
});
```

**Request (Reset all settings):**
```javascript
fetch('/api/settings/reset', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    credentials: 'include',
    body: JSON.stringify({})
});
```

**Success Response (200):**
```json
{
    "success": true,
    "data": {
        "settings": {
            // Complete settings object with reset values
        }
    },
    "message": "Privacy settings reset to default"
}
```

---

### 17. Export Settings

**Endpoint:** `GET /api/settings/export`

**Description:** Export user settings as a downloadable JSON file (excludes sensitive data).

**Request:**
```javascript
fetch('/api/settings/export', {
    method: 'GET',
    credentials: 'include'
});
```

**Success Response (200):**
Downloads a JSON file with exported settings.

**Content-Type:** `application/json`
**Content-Disposition:** `attachment; filename="settings-export-YYYY-MM-DD.json"`

---

### 18. Import Settings

**Endpoint:** `POST /api/settings/import`

**Description:** Import settings from a previously exported JSON file.

**Request:**
```javascript
fetch('/api/settings/import', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    credentials: 'include',
    body: JSON.stringify({
        "privacy": {
            "profileVisibility": "followers"
        },
        "notifications": {
            "pushNotifications": true
        }
        // ... other settings sections
    })
});
```

**Success Response (200):**
```json
{
    "success": true,
    "data": {
        "settings": {
            // Complete updated settings object
        }
    },
    "message": "Settings imported successfully"
}
```

---

## 🔄 Complete Integration Example

Here's a complete React component example showing how to integrate with the Settings API:

```jsx
import React, { useState, useEffect } from 'react';

const SettingsManager = () => {
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Fetch all settings on component mount
    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/settings', {
                credentials: 'include'
            });
            const data = await response.json();
            
            if (data.success) {
                setSettings(data.data.settings);
            } else {
                setError(data.error);
            }
        } catch (err) {
            setError('Failed to fetch settings');
        } finally {
            setLoading(false);
        }
    };

    const updateNotificationSettings = async (updates) => {
        try {
            const response = await fetch('/api/settings/notifications', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(updates)
            });
            
            const data = await response.json();
            
            if (data.success) {
                setSettings(prev => ({
                    ...prev,
                    notifications: data.data.notifications
                }));
                return { success: true };
            } else {
                return { success: false, error: data.error };
            }
        } catch (err) {
            return { success: false, error: 'Network error' };
        }
    };

    const blockUser = async (userId, reason) => {
        try {
            const response = await fetch('/api/settings/block', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    targetUserId: userId,
                    reason: reason
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Refresh settings to get updated blocked users list
                await fetchSettings();
                return { success: true };
            } else {
                return { success: false, error: data.error };
            }
        } catch (err) {
            return { success: false, error: 'Network error' };
        }
    };

    if (loading) return <div>Loading settings...</div>;
    if (error) return <div>Error: {error}</div>;
    if (!settings) return <div>No settings found</div>;

    return (
        <div className="settings-manager">
            <h2>Settings Manager</h2>
            
            {/* Notification Settings */}
            <div className="notification-settings">
                <h3>Notifications</h3>
                <label>
                    <input
                        type="checkbox"
                        checked={settings.notifications.pushNotifications}
                        onChange={async (e) => {
                            const result = await updateNotificationSettings({
                                pushNotifications: e.target.checked
                            });
                            if (!result.success) {
                                alert(`Error: ${result.error}`);
                            }
                        }}
                    />
                    Push Notifications
                </label>
            </div>

            {/* Privacy Settings */}
            <div className="privacy-settings">
                <h3>Privacy</h3>
                <p>Profile Visibility: {settings.privacy.profileVisibility}</p>
                <p>Who can message me: {settings.privacy.whoCanMessageMe}</p>
            </div>

            {/* Block User Example */}
            <button onClick={() => blockUser('some-user-id', 'Spam')}>
                Block User
            </button>
        </div>
    );
};

export default SettingsManager;
```

---

## 🚨 Common Error Responses

### Authentication Errors
```json
{
    "success": false,
    "error": "Authentication required"
}
```

### Validation Errors
```json
{
    "success": false,
    "error": "Validation failed",
    "details": [
        {
            "type": "field",
            "msg": "Profile visibility must be public, followers, or private",
            "path": "profileVisibility",
            "location": "body"
        }
    ]
}
```

### Server Errors
```json
{
    "success": false,
    "error": "Failed to update settings"
}
```

### Not Found Errors
```json
{
    "success": false,
    "error": "User not found"
}
```

---

## 📝 Best Practices

### 1. Error Handling
Always check the `success` field and handle errors appropriately:

```javascript
const response = await fetch('/api/settings/privacy', { /* ... */ });
const data = await response.json();

if (data.success) {
    // Handle success
    console.log('Settings updated:', data.data);
} else {
    // Handle error
    console.error('Error:', data.error);
    if (data.details) {
        // Handle validation errors
        data.details.forEach(detail => {
            console.error(`${detail.path}: ${detail.msg}`);
        });
    }
}
```

### 2. Optimistic Updates
Update UI immediately and handle errors:

```javascript
const [notifications, setNotifications] = useState(initialNotifications);

const toggleNotification = async (field, value) => {
    // Optimistic update
    setNotifications(prev => ({ ...prev, [field]: value }));
    
    const result = await updateNotificationSettings({ [field]: value });
    
    if (!result.success) {
        // Revert on error
        setNotifications(prev => ({ ...prev, [field]: !value }));
        alert(`Error: ${result.error}`);
    }
};
```

### 3. Caching and State Management
Consider using a state management library to cache settings:

```javascript
// Using Context API
const SettingsContext = createContext();

const SettingsProvider = ({ children }) => {
    const [settings, setSettings] = useState(null);
    
    const updateSettings = async (section, data) => {
        const response = await fetch(`/api/settings/${section}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
            setSettings(prev => ({ 
                ...prev, 
                [section]: result.data[section] 
            }));
        }
        
        return result;
    };

    return (
        <SettingsContext.Provider value={{ settings, updateSettings }}>
            {children}
        </SettingsContext.Provider>
    );
};
```

### 4. Validation
Validate data client-side before sending to API:

```javascript
const validatePrivacySettings = (settings) => {
    const validVisibility = ['public', 'followers', 'private'];
    const validMessagePermissions = ['everyone', 'followers', 'nobody'];
    
    if (!validVisibility.includes(settings.profileVisibility)) {
        return { valid: false, error: 'Invalid profile visibility' };
    }
    
    if (!validMessagePermissions.includes(settings.whoCanMessageMe)) {
        return { valid: false, error: 'Invalid message permission' };
    }
    
    return { valid: true };
};
```

---

## 🎯 Migration from Legacy Endpoints

If you were using the old notification settings endpoints, here's the migration:

### Old (❌ Deprecated)
```javascript
// Don't use these anymore
GET /api/notifications/settings
PUT /api/notifications/settings
```

### New (✅ Use these)
```javascript
// Get all settings including notifications
GET /api/settings

// Update notification settings specifically
PUT /api/settings/notifications
```

---

This complete guide provides everything needed to integrate with the Settings API. The API is production-ready and handles all aspects of user preference management for your social media platform.
