# Frontend Migration Guide - Notification Settings Consolidation

## 🚨 Breaking Changes Alert

The notification settings have been moved from the User model to the Settings model. This requires frontend updates to use the new API endpoints and data structure.

## 📋 Summary of Changes

### Removed Endpoints
- ❌ `GET /api/notifications/settings`
- ❌ `PUT /api/notifications/settings`

### New/Updated Endpoints
- ✅ `GET /api/settings` (includes notification settings)
- ✅ `PUT /api/settings/notifications` (update notification settings)

### Data Structure Changes
- ❌ `user.notificationSettings` (removed from User model)
- ✅ `settings.notifications` (new location in Settings model)

---

## 🔄 Frontend Code Migration

### 1. Fetching Notification Settings

#### Before (❌ Don't use)
```javascript
// OLD WAY - This endpoint no longer exists
const response = await fetch('/api/notifications/settings', {
    method: 'GET',
    credentials: 'include'
});
const data = await response.json();
const notificationSettings = data.notificationSettings;
```

#### After (✅ Use this)
```javascript
// NEW WAY - Get all settings including notifications
const response = await fetch('/api/settings', {
    method: 'GET',
    credentials: 'include'
});
const data = await response.json();
const notificationSettings = data.settings.notifications;

// OR - Get only notification summary
const summaryResponse = await fetch('/api/settings/summary', {
    method: 'GET',
    credentials: 'include'
});
const summaryData = await summaryResponse.json();
const notificationSummary = summaryData.summary.notifications;
```

### 2. Updating Notification Settings

#### Before (❌ Don't use)
```javascript
// OLD WAY - This endpoint no longer exists
const response = await fetch('/api/notifications/settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
        likes: true,
        comments: false,
        shares: true,
        follows: true,
        messages: true,
        groupChats: false
    })
});
```

#### After (✅ Use this)
```javascript
// NEW WAY - Update notification settings via settings API
const response = await fetch('/api/settings/notifications', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
        pushNotifications: true,
        likes: true,
        comments: false,
        shares: true,
        follows: true,
        messages: true,
        groupChats: false,
        emailNotifications: true,
        weeklyDigest: false,
        quietHours: {
            enabled: true,
            startTime: "22:00",
            endTime: "08:00"
        }
    })
});
```

### 3. React Components Migration

#### Before (❌ Don't use)
```jsx
// OLD WAY - User state with notification settings
const [user, setUser] = useState({
    // ... other user fields
    notificationSettings: {
        likes: true,
        comments: true,
        shares: true,
        follows: true,
        messages: true,
        groupChats: true
    }
});

// Fetching user data with notification settings
useEffect(() => {
    const fetchUserData = async () => {
        const userResponse = await fetch('/api/user/profile');
        const userData = await userResponse.json();
        
        const notifResponse = await fetch('/api/notifications/settings');
        const notifData = await notifResponse.json();
        
        setUser({
            ...userData.user,
            notificationSettings: notifData.notificationSettings
        });
    };
    
    fetchUserData();
}, []);
```

#### After (✅ Use this)
```jsx
// NEW WAY - Separate user and settings state
const [user, setUser] = useState({
    // ... user fields (no notificationSettings)
});

const [settings, setSettings] = useState({
    notifications: {
        pushNotifications: true,
        likes: true,
        comments: true,
        shares: true,
        follows: true,
        messages: true,
        groupChats: true,
        emailNotifications: false,
        quietHours: {
            enabled: false,
            startTime: "22:00",
            endTime: "08:00"
        }
    }
    // ... other settings sections
});

// Fetching user and settings separately
useEffect(() => {
    const fetchData = async () => {
        const [userResponse, settingsResponse] = await Promise.all([
            fetch('/api/user/profile'),
            fetch('/api/settings')
        ]);
        
        const userData = await userResponse.json();
        const settingsData = await settingsResponse.json();
        
        setUser(userData.user);
        setSettings(settingsData.settings);
    };
    
    fetchData();
}, []);
```

### 4. Notification Settings Component

#### Complete React Component Example
```jsx
import React, { useState, useEffect } from 'react';

const NotificationSettings = () => {
    const [notifications, setNotifications] = useState({
        pushNotifications: true,
        likes: true,
        comments: true,
        shares: true,
        follows: true,
        messages: true,
        groupChats: true,
        messagePreview: true,
        emailNotifications: false,
        weeklyDigest: false,
        quietHours: {
            enabled: false,
            startTime: "22:00",
            endTime: "08:00"
        }
    });

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Fetch notification settings
    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const response = await fetch('/api/settings', {
                    credentials: 'include'
                });
                const data = await response.json();
                
                if (data.success) {
                    setNotifications(data.settings.notifications);
                }
            } catch (error) {
                console.error('Failed to fetch settings:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchSettings();
    }, []);

    // Update notification settings
    const updateNotifications = async (updates) => {
        setSaving(true);
        try {
            const response = await fetch('/api/settings/notifications', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(updates)
            });
            
            const data = await response.json();
            
            if (data.success) {
                setNotifications(prev => ({ ...prev, ...updates }));
                // Show success message
            } else {
                // Show error message
                console.error('Failed to update settings:', data.error);
            }
        } catch (error) {
            console.error('Failed to update settings:', error);
        } finally {
            setSaving(false);
        }
    };

    // Handle toggle changes
    const handleToggle = (field, value) => {
        const updates = { [field]: value };
        updateNotifications(updates);
    };

    // Handle quiet hours
    const handleQuietHours = (quietHoursData) => {
        const updates = { quietHours: quietHoursData };
        updateNotifications(updates);
    };

    if (loading) return <div>Loading notification settings...</div>;

    return (
        <div className="notification-settings">
            <h2>Notification Settings</h2>
            
            {/* Push Notifications */}
            <div className="setting-group">
                <h3>Push Notifications</h3>
                <label>
                    <input
                        type="checkbox"
                        checked={notifications.pushNotifications}
                        onChange={(e) => handleToggle('pushNotifications', e.target.checked)}
                        disabled={saving}
                    />
                    Enable push notifications
                </label>
            </div>

            {/* Activity Notifications */}
            <div className="setting-group">
                <h3>Activity Notifications</h3>
                {['likes', 'comments', 'shares', 'follows'].map(type => (
                    <label key={type}>
                        <input
                            type="checkbox"
                            checked={notifications[type]}
                            onChange={(e) => handleToggle(type, e.target.checked)}
                            disabled={saving || !notifications.pushNotifications}
                        />
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                    </label>
                ))}
            </div>

            {/* Chat Notifications */}
            <div className="setting-group">
                <h3>Chat Notifications</h3>
                <label>
                    <input
                        type="checkbox"
                        checked={notifications.messages}
                        onChange={(e) => handleToggle('messages', e.target.checked)}
                        disabled={saving || !notifications.pushNotifications}
                    />
                    Direct Messages
                </label>
                <label>
                    <input
                        type="checkbox"
                        checked={notifications.groupChats}
                        onChange={(e) => handleToggle('groupChats', e.target.checked)}
                        disabled={saving || !notifications.pushNotifications}
                    />
                    Group Chats
                </label>
                <label>
                    <input
                        type="checkbox"
                        checked={notifications.messagePreview}
                        onChange={(e) => handleToggle('messagePreview', e.target.checked)}
                        disabled={saving || !notifications.pushNotifications}
                    />
                    Show message preview
                </label>
            </div>

            {/* Email Notifications */}
            <div className="setting-group">
                <h3>Email Notifications</h3>
                <label>
                    <input
                        type="checkbox"
                        checked={notifications.emailNotifications}
                        onChange={(e) => handleToggle('emailNotifications', e.target.checked)}
                        disabled={saving}
                    />
                    Email notifications
                </label>
                <label>
                    <input
                        type="checkbox"
                        checked={notifications.weeklyDigest}
                        onChange={(e) => handleToggle('weeklyDigest', e.target.checked)}
                        disabled={saving || !notifications.emailNotifications}
                    />
                    Weekly digest email
                </label>
            </div>

            {/* Quiet Hours */}
            <div className="setting-group">
                <h3>Quiet Hours</h3>
                <label>
                    <input
                        type="checkbox"
                        checked={notifications.quietHours.enabled}
                        onChange={(e) => handleQuietHours({
                            ...notifications.quietHours,
                            enabled: e.target.checked
                        })}
                        disabled={saving}
                    />
                    Enable quiet hours
                </label>
                
                {notifications.quietHours.enabled && (
                    <div>
                        <label>
                            Start time:
                            <input
                                type="time"
                                value={notifications.quietHours.startTime}
                                onChange={(e) => handleQuietHours({
                                    ...notifications.quietHours,
                                    startTime: e.target.value
                                })}
                                disabled={saving}
                            />
                        </label>
                        <label>
                            End time:
                            <input
                                type="time"
                                value={notifications.quietHours.endTime}
                                onChange={(e) => handleQuietHours({
                                    ...notifications.quietHours,
                                    endTime: e.target.value
                                })}
                                disabled={saving}
                            />
                        </label>
                    </div>
                )}
            </div>

            {saving && <div>Saving...</div>}
        </div>
    );
};

export default NotificationSettings;
```

---

## 🗃️ Data Structure Reference

### New Settings Response Structure
```json
{
  "success": true,
  "data": {
    "settings": {
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
      "privacy": {
        // ... privacy settings
      },
      "security": {
        // ... security settings
      }
      // ... other settings sections
    }
  }
}
```

### Old vs New Notification Fields Mapping
| Old Field (removed) | New Field Location | Notes |
|---------------------|-------------------|--------|
| `user.notificationSettings.likes` | `settings.notifications.likes` | Same field name |
| `user.notificationSettings.comments` | `settings.notifications.comments` | Same field name |
| `user.notificationSettings.shares` | `settings.notifications.shares` | Same field name |
| `user.notificationSettings.follows` | `settings.notifications.follows` | Same field name |
| `user.notificationSettings.messages` | `settings.notifications.messages` | Same field name |
| `user.notificationSettings.groupChats` | `settings.notifications.groupChats` | Same field name |
| N/A | `settings.notifications.pushNotifications` | New master toggle |
| N/A | `settings.notifications.followerRequests` | New granular control |
| N/A | `settings.notifications.messagePreview` | New feature |
| N/A | `settings.notifications.emailNotifications` | New feature |
| N/A | `settings.notifications.weeklyDigest` | New feature |
| N/A | `settings.notifications.quietHours` | New feature |

---

## 🧪 Testing Migration

### Test Checklist
- [ ] Remove all references to `/api/notifications/settings`
- [ ] Update all notification settings fetching to use `/api/settings`
- [ ] Update all notification settings updating to use `/api/settings/notifications`
- [ ] Remove `user.notificationSettings` from state management
- [ ] Add `settings.notifications` to state management
- [ ] Test that notification preferences are correctly loaded
- [ ] Test that notification preferences are correctly saved
- [ ] Test that new features (quiet hours, email notifications) work
- [ ] Test that existing notification functionality still works
- [ ] Test error handling for the new endpoints

### Test the Migration
1. **Check API endpoints work:**
   ```bash
   # Should return 404 (removed)
   curl -X GET http://localhost:3000/api/notifications/settings
   
   # Should return settings including notifications
   curl -X GET http://localhost:3000/api/settings
   ```

2. **Test updating notifications:**
   ```bash
   # Should work
   curl -X PUT http://localhost:3000/api/settings/notifications \
     -H "Content-Type: application/json" \
     -d '{"likes": false, "comments": true}'
   ```

3. **Verify data structure:**
   ```javascript
   // In browser console after login
   fetch('/api/settings')
     .then(r => r.json())
     .then(data => console.log(data.settings.notifications));
   ```

---

## 🚀 Deployment Checklist

### Backend
- [ ] Run migration script: `node migrateSettings.js`
- [ ] Verify all users have settings created
- [ ] Verify notification settings transferred correctly
- [ ] Verify old notificationSettings field removed from users
- [ ] Test all new endpoints work
- [ ] Test notification services use new Settings model

### Frontend
- [ ] Update all API calls to use new endpoints
- [ ] Update state management for settings structure
- [ ] Remove user.notificationSettings references
- [ ] Add settings.notifications support
- [ ] Test notification settings UI works
- [ ] Test real-time notifications still work
- [ ] Update any cached/stored notification settings

### Documentation
- [ ] Update API documentation
- [ ] Update frontend integration guides
- [ ] Update any postman collections or API tests
- [ ] Inform team about breaking changes

---

## ❓ Need Help?

If you encounter issues during migration:

1. **Check the console** for API errors
2. **Verify endpoints** are updated correctly
3. **Check data structure** matches the new format
4. **Run the migration script** if settings are missing
5. **Review the API documentation** for correct usage

The migration preserves all existing notification preferences while adding powerful new features. Take your time to update each component systematically!
