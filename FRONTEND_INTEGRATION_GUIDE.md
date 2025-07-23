# 🔔 Firebase Push Notifications - Frontend Integration Guide

## Overview
Your backend notification system is working perfectly! The issue is that no FCM tokens are registered. This guide will help you integrate Firebase push notifications on the frontend.

## 📋 Current Status
- ✅ Backend notification system implemented
- ✅ Firebase Admin SDK configured  
- ✅ API endpoints available (`/api/notifications/fcm-token`)
- ❌ Frontend Firebase SDK not integrated
- ❌ No FCM tokens registered in database

## 🚀 Frontend Implementation Steps

### 1. Install Firebase SDK
```bash
npm install firebase
```

### 2. Firebase Configuration
Create `src/config/firebase.js`:
```javascript
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "social-media-app-881bf.firebaseapp.com",
  projectId: "social-media-app-881bf",
  storageBucket: "social-media-app-881bf.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

export { messaging };
```

### 3. Service Worker Setup
Create `public/firebase-messaging-sw.js`:
```javascript
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "your-api-key",
  authDomain: "social-media-app-881bf.firebaseapp.com",
  projectId: "social-media-app-881bf",
  storageBucket: "social-media-app-881bf.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('Background message received:', payload);
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/favicon.ico',
    badge: '/badge-icon.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
```

### 4. Notification Service
Create `src/services/notificationService.js`:
```javascript
import { messaging } from '../config/firebase';
import { getToken, onMessage } from 'firebase/messaging';

const VAPID_KEY = 'your-vapid-key'; // Get from Firebase Console > Project Settings > Cloud Messaging

class NotificationService {
  constructor() {
    this.token = null;
    this.isSupported = 'serviceWorker' in navigator && 'Notification' in window;
  }

  async requestPermission() {
    if (!this.isSupported) {
      console.warn('Push messaging is not supported');
      return false;
    }

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  async getFCMToken() {
    try {
      if (!this.isSupported) return null;

      const hasPermission = await this.requestPermission();
      if (!hasPermission) {
        console.warn('Notification permission denied');
        return null;
      }

      const currentToken = await getToken(messaging, {
        vapidKey: VAPID_KEY
      });

      if (currentToken) {
        this.token = currentToken;
        console.log('FCM Token:', currentToken);
        return currentToken;
      } else {
        console.warn('No registration token available');
        return null;
      }
    } catch (error) {
      console.error('Error getting FCM token:', error);
      return null;
    }
  }

  async registerToken(token) {
    try {
      const response = await fetch('/api/notifications/fcm-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies
        body: JSON.stringify({
          token: token,
          device: 'web'
        })
      });

      const result = await response.json();
      if (result.success) {
        console.log('✅ FCM token registered successfully');
        return true;
      } else {
        console.error('❌ Failed to register FCM token:', result);
        return false;
      }
    } catch (error) {
      console.error('❌ Error registering FCM token:', error);
      return false;
    }
  }

  setupForegroundMessageListener() {
    if (!this.isSupported) return;

    onMessage(messaging, (payload) => {
      console.log('Foreground message received:', payload);
      
      // Show notification manually for foreground messages
      if (Notification.permission === 'granted') {
        new Notification(payload.notification.title, {
          body: payload.notification.body,
          icon: '/favicon.ico'
        });
      }
    });
  }

  async initialize() {
    try {
      console.log('🔔 Initializing notification service...');
      
      const token = await this.getFCMToken();
      if (token) {
        await this.registerToken(token);
        this.setupForegroundMessageListener();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
      return false;
    }
  }
}

export default new NotificationService();
```

### 5. Integration in App Component
In your main App component or login success handler:
```javascript
import notificationService from './services/notificationService';

// Call this after user logs in
const initializeNotifications = async () => {
  const initialized = await notificationService.initialize();
  if (initialized) {
    console.log('✅ Push notifications ready!');
  } else {
    console.log('❌ Push notifications not available');
  }
};

// Call this on app start or after login
useEffect(() => {
  initializeNotifications();
}, []);
```

### 6. Get Firebase Config Values
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `social-media-app-881bf`
3. Go to Project Settings (gear icon)
4. In "General" tab, scroll to "Your apps" section
5. If no web app exists, click "Add app" and select web
6. Copy the config object values
7. For VAPID key: Go to "Cloud Messaging" tab and copy the "Web Push certificates" key

### 7. Test the Integration
1. Login as any user on frontend
2. Accept notification permissions when prompted
3. Check browser console for "FCM Token registered successfully"
4. Perform actions (like, comment) from another user
5. You should see push notifications!

## 🔧 Debugging Tips

### Check if tokens are being registered:
```bash
# Run this on your backend
node scripts/test-fcm-tokens.js
```

### Browser Console Checks:
```javascript
// Check if service worker is registered
navigator.serviceWorker.getRegistrations().then(registrations => {
  console.log('Service Workers:', registrations);
});

// Check notification permission
console.log('Notification permission:', Notification.permission);
```

### Backend Logs:
When FCM tokens are successfully registered, you should see in your backend terminal:
```
✅ FCM token added successfully
```

## 🎯 Expected Flow After Integration

1. **User logs in** → Frontend requests notification permission
2. **Permission granted** → Firebase SDK generates FCM token  
3. **Token generated** → Frontend sends token to backend via `/api/notifications/fcm-token`
4. **Token stored** → Backend can now send push notifications to that device
5. **User interaction** → Push notifications work! 🎉

## 📱 Platform Support
- ✅ Chrome/Chromium browsers
- ✅ Firefox  
- ✅ Safari (with limitations)
- ✅ Edge
- ❌ iOS Safari (Apple restrictions)

Your backend is ready - just need the frontend integration! 🚀
