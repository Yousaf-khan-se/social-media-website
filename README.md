this project contains backend rest apis' hosted on :
https://social-media-website-backend-dsj2.onrender.com/api

## 🚀 API Routes

### **Base Routes**
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | API welcome message and server status |
| `GET` | `/api/health` | Health check endpoint with uptime |

### **Authentication Routes** (`/api/auth`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/register` | Register a new user |
| `POST` | `/api/auth/login` | Login user |
| `POST` | `/api/auth/refresh` | Refresh JWT token |
| `POST` | `/api/auth/forgot-password` | Request password reset |
| `POST` | `/api/auth/reset-password` | Reset password with token |
| `GET` | `/api/auth/me` | Get current user profile |
| `POST` | `/api/auth/logout` | Logout user |
| `POST` | `/api/auth/change-password` | Change user password |

### **Posts Routes** (`/api/posts`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/posts` | Create a new post |
| `GET` | `/api/posts/my-posts` | Get current user's posts |
| `GET` | `/api/posts/feed` | Get personalized feed |
| `GET` | `/api/posts/explore` | Get public posts (explore) |
| `GET` | `/api/posts/search` | Search posts |
| `GET` | `/api/posts/user/:userId` | Get specific user's posts |
| `GET` | `/api/posts/:postId` | Get a specific post by ID |
| `PUT` | `/api/posts/:postId` | Update a post |
| `DELETE` | `/api/posts/:postId` | Delete a post |
| `PUT` | `/api/posts/media/:postId` | Upload images to a post |

### **User Routes** (`/api/users`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `PUT` | `/api/users/profile` | Update authenticated user's profile |
| `GET` | `/api/users/search` | Search users |
| `GET` | `/api/users/followers` | Get followers of the authenticated user |
| `GET` | `/api/users/following` | Get followings of the authenticated user |
| `POST` | `/api/users/:followId/follow` | Follow a user |
| `DELETE` | `/api/users/:followId/follow` | Unfollow a user |

### **Chat Routes** (`/api/chats`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/chats/create` | Create a new chat room |
| `GET` | `/api/chats` | Get all chat rooms for the authenticated user |
| `DELETE` | `/api/chats/:roomId` | Delete a chat room |
| `GET` | `/api/chats/:roomId/messages` | Get messages from a chat room |
| `DELETE` | `/api/chats/message/:messageId` | Delete a specific message |
| `PUT` | `/api/chats/media/:roomId` | Upload media to a chat room |

## 📋 Route Summary
- **Total Base Routes**: 2
- **Authentication Routes**: 8
- **Posts Routes**: 10
- **User Routes**: 6
- **Chat Routes**: 6
- **Total Active Routes**: 32

## 🔒 Authentication Required
All routes under `/api/posts`, `/api/users`, and `/api/chats` require JWT authentication via the `Authorization` header or cookies.