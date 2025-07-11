this project contains backend rest apis' hosted on :
https://social-media-website-lovat-gamma.vercel.app/

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
| `POST` | `/api/posts/:postId/like` | Like/unlike a post |
| `POST` | `/api/posts/:postId/comments` | Add comment to post |
| `DELETE` | `/api/posts/:postId/comments/:commentId` | Delete a comment |

## 📋 Route Summary
- **Total Base Routes**: 2
- **Authentication Routes**: 8
- **Posts Routes**: 10
- **Total Active Routes**: 20

## 🔒 Authentication Required
All routes under `/api/posts` and protected auth routes (`/api/auth/me`, `/api/auth/logout`, `/api/auth/change-password`) require JWT authentication via: