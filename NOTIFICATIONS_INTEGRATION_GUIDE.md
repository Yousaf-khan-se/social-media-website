# Firebase Push Notifications Integration Guide

This document provides comprehensive guidance for integrating Firebase push notifications with the Social Media Platform frontend.

## Table of Contents
1. [Overview](#overview)
2. [Backend Features](#backend-features)
3. [API Endpoints](#api-endpoints)
4. [Frontend Integration](#frontend-integration)
5. [Notification Types](#notification-types)
6. [Firebase Setup](#firebase-setup)
7. [Testing](#testing)
8. [Troubleshooting](#troubleshooting)

## Overview

The backend now supports Firebase Cloud Messaging (FCM) push notifications for:
- Post interactions (likes, comments, shares)
- Follow events
- Chat messages (only sent to offline users for 1-on-1 chats)
- Chat room creation
- Group chat creation and additions

## Backend Features

### Notification Storage
- All notifications are stored in MongoDB with metadata
- Automatic cleanup after 90 days
- Read/unread status tracking
- Delivery status tracking

### User Preferences
- Per-notification type settings
- Multiple device token support
- Online/offline status tracking

### Smart Notification Logic
- No self-notifications (users don't get notified of their own actions)
- Offline-only messaging notifications for 1-on-1 chats
- Always send notifications for group chat activities

## API Endpoints

### Base URL
All notification endpoints are prefixed with `/api/notifications`

### Authentication
All endpoints require authentication via JWT token in cookies or Authorization header.

### Endpoints

#### 1. Get Notifications
```http
GET /api/notifications
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)
- `type` (optional): Filter by notification type
- `unreadOnly` (optional): Boolean, show only unread notifications

**Response:**
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "_id": "notification_id",
        "recipient": "user_id",
        "sender": {
          "_id": "sender_id",
          "firstName": "John",
          "lastName": "Doe",
          "username": "johndoe",
          "profilePicture": "profile_url"
        },
        "type": "like",
        "title": "New Like",
        "body": "John Doe liked your post",
        "data": {
          "postId": "post_id",
          "senderId": "sender_id",
          "senderName": "John Doe"
        },
        "isRead": false,
        "createdAt": "2025-01-16T10:30:00Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalCount": 100,
      "hasMore": true
    },
    "unreadCount": 25
  }
}
```

#### 2. Mark Notification as Read
```http
PUT /api/notifications/:notificationId/read
```

#### 3. Mark All Notifications as Read
```http
PUT /api/notifications/read-all
```

#### 4. Delete Notification
```http
DELETE /api/notifications/:notificationId
```

#### 5. Clear All Notifications
```http
DELETE /api/notifications
```

#### 6. Add FCM Token
```http
POST /api/notifications/fcm-token
```

**Request Body:**
```json
{
  "token": "fcm_device_token_here",
  "device": "web" // "web", "android", or "ios"
}
```

#### 7. Remove FCM Token
```http
DELETE /api/notifications/fcm-token
```

**Request Body:**
```json
{
  "token": "fcm_device_token_here"
}
```

#### 8. Update Notification Settings
```http
PUT /api/notifications/settings
```

**Request Body:**
```json
{
  "likes": true,
  "comments": true,
  "shares": true,
  "follows": true,
  "messages": true,
  "groupChats": true
}
```

#### 9. Get Notification Settings
```http
GET /api/notifications/settings
```

#### 10. Get Notification Statistics
```http
GET /api/notifications/stats
```

## Frontend Integration

### 1. Firebase Setup in Frontend

First, install Firebase SDK:
```bash
npm install firebase
```

Initialize Firebase in your frontend:
```javascript
// firebase-config.js
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
};

const app = initializeApp(firebaseConfig);
export const messaging = getMessaging(app);
```

### 2. Request Notification Permission

```javascript
// notifications.js
import { messaging } from './firebase-config';
import { getToken, onMessage } from 'firebase/messaging';

export const requestNotificationPermission = async () => {
  try {
    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      // Get FCM token
      const token = await getToken(messaging, {
        vapidKey: 'your-vapid-key' // Get this from Firebase Console
      });
      
      if (token) {
        // Send token to backend
        await fetch('/api/notifications/fcm-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({
            token: token,
            device: 'web'
          })
        });
        
        console.log('FCM token sent to backend');
        return token;
      }
    } else {
      console.log('Notification permission denied');
    }
  } catch (error) {
    console.error('Error getting notification permission:', error);
  }
};
```

### 3. Handle Foreground Notifications

```javascript
// Handle messages when app is in foreground
export const setupForegroundNotifications = () => {
  onMessage(messaging, (payload) => {
    console.log('Foreground message received:', payload);
    
    // Show custom notification or update UI
    showCustomNotification(payload);
  });
};

const showCustomNotification = (payload) => {
  // You can create custom in-app notifications here
  // or use a toast library like react-toastify
  
  const { title, body, data } = payload.notification;
  
  // Example using browser's Notification API
  if (Notification.permission === 'granted') {
    const notification = new Notification(title, {
      body: body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      data: data
    });
    
    notification.onclick = (event) => {
      event.preventDefault();
      handleNotificationClick(data);
      notification.close();
    };
  }
};

const handleNotificationClick = (data) => {
  const { type, postId, chatRoomId } = data;
  
  switch (type) {
    case 'like':
    case 'comment':
    case 'share':
      // Navigate to post
      window.location.href = `/posts/${postId}`;
      break;
    case 'message':
    case 'chat_created':
    case 'group_created':
      // Navigate to chat
      window.location.href = `/chats/${chatRoomId}`;
      break;
    case 'follow':
      // Navigate to profile
      window.location.href = `/profile/${data.senderId}`;
      break;
  }
};
```

### 4. Background Message Handling

Create `public/firebase-messaging-sw.js`:

```javascript
// public/firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('Background message received:', payload);
  
  const { title, body, data } = payload.notification;
  
  const notificationOptions = {
    body: body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    data: data
  };
  
  self.registration.showNotification(title, notificationOptions);
});

// Handle notification click in background
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const { type, postId, chatRoomId, senderId } = event.notification.data;
  
  let url = '/';
  
  switch (type) {
    case 'like':
    case 'comment':
    case 'share':
      url = `/posts/${postId}`;
      break;
    case 'message':
    case 'chat_created':
    case 'group_created':
      url = `/chats/${chatRoomId}`;
      break;
    case 'follow':
      url = `/profile/${senderId}`;
      break;
  }
  
  event.waitUntil(
    clients.openWindow(url)
  );
});
```

### 5. Notification Management Component

```jsx
// NotificationManager.jsx
import React, { useState, useEffect } from 'react';
import { requestNotificationPermission, setupForegroundNotifications } from './notifications';

const NotificationManager = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [settings, setSettings] = useState({});

  useEffect(() => {
    // Request permission and setup on component mount
    initializeNotifications();
    fetchNotifications();
    fetchSettings();
  }, []);

  const initializeNotifications = async () => {
    await requestNotificationPermission();
    setupForegroundNotifications();
  };

  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/notifications?limit=50', {
        credentials: 'include'
      });
      const data = await response.json();
      
      if (data.success) {
        setNotifications(data.data.notifications);
        setUnreadCount(data.data.unreadCount);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/notifications/settings', {
        credentials: 'include'
      });
      const data = await response.json();
      
      if (data.success) {
        setSettings(data.data.notificationSettings);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PUT',
        credentials: 'include'
      });
      
      // Update local state
      setNotifications(prev => 
        prev.map(notif => 
          notif._id === notificationId 
            ? { ...notif, isRead: true } 
            : notif
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch('/api/notifications/read-all', {
        method: 'PUT',
        credentials: 'include'
      });
      
      setNotifications(prev => 
        prev.map(notif => ({ ...notif, isRead: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const updateSettings = async (newSettings) => {
    try {
      await fetch('/api/notifications/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(newSettings)
      });
      
      setSettings(newSettings);
    } catch (error) {
      console.error('Error updating settings:', error);
    }
  };

  return (
    <div className="notification-manager">
      {/* Your notification UI components here */}
    </div>
  );
};

export default NotificationManager;
```

### 6. Real-time Updates with Socket.io

If you want real-time notification updates, you can listen to socket events:

```javascript
// In your socket setup
socket.on('newNotification', (notification) => {
  // Update notification list
  setNotifications(prev => [notification, ...prev]);
  setUnreadCount(prev => prev + 1);
  
  // Show toast notification
  showToast(notification);
});
```

## Notification Types

### Post Interactions
- **like**: When someone likes your post
- **comment**: When someone comments on your post  
- **share**: When someone shares your post

### Social Interactions
- **follow**: When someone follows you

### Chat/Messaging
- **message**: New message in chat (only sent to offline users for 1-on-1)
- **chat_created**: Someone started a new chat with you
- **group_created**: You were added to a new group chat

### Data Structure
Each notification includes:
```javascript
{
  type: 'notification_type',
  title: 'Notification Title',
  body: 'Notification Body',
  data: {
    // Type-specific data
    postId: 'post_id',      // For post notifications
    chatRoomId: 'chat_id',  // For chat notifications
    senderId: 'sender_id',  // Always present
    senderName: 'Sender Name',
    senderProfilePicture: 'profile_url'
  }
}
```

## Firebase Setup

### 1. Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project
3. Enable Cloud Messaging

### 2. Get Configuration
1. Go to Project Settings → General
2. Add a web app
3. Copy the config object

### 3. Generate Service Account Key
1. Go to Project Settings → Service accounts
2. Click "Generate new private key"
3. Download the JSON file
4. Extract values for your `.env` file

### 4. Get VAPID Key
1. Go to Project Settings → Cloud Messaging
2. Web configuration → Generate key pair
3. Use this key in your frontend

## Testing

### Test Notification Flow
1. Register FCM token via `/api/notifications/fcm-token`
2. Perform actions that trigger notifications (like a post, send message, etc.)
3. Check notification delivery in browser dev tools
4. Verify notification storage via `/api/notifications`

### Debug Common Issues
- Check browser notification permissions
- Verify FCM token is properly registered
- Check Firebase project configuration
- Ensure service worker is properly registered
- Check network requests in dev tools

## Troubleshooting

### Common Issues

1. **Notifications not received**
   - Check if FCM token is registered
   - Verify notification permissions
   - Check if user has disabled notification type in settings

2. **Service Worker Issues**
   - Ensure `firebase-messaging-sw.js` is in public folder
   - Check service worker registration in dev tools
   - Clear service worker cache if needed

3. **Token Issues**
   - FCM tokens can expire, implement token refresh
   - Multiple tabs can generate different tokens
   - Test with incognito mode for clean state

4. **Background vs Foreground**
   - Different handling required for each state
   - Background uses service worker
   - Foreground uses onMessage listener

### Environment Variables Required

Add these to your backend `.env` file:
```
FIREBASE_TYPE=service_account
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY_ID=your-private-key-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour-key-here\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=your-client-id
FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token
FIREBASE_AUTH_PROVIDER_X509_CERT_URL=https://www.googleapis.com/oauth2/v1/certs
FIREBASE_CLIENT_X509_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxx%40your-project.iam.gserviceaccount.com
```

For any questions or issues, please refer to the backend API documentation or contact the development team.
