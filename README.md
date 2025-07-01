# Social Media Platform Backend

A modern Express.js backend server built for social media platform with serverless-http support for deployment on AWS Lambda, Vercel, or other serverless platforms.

## 🏗️ **Architecture & Design Patterns**

This project follows a **modular, layered architecture** for better maintainability and scalability:

### **Layer Separation:**
- **Routes** (`/routes`) - Handle HTTP routing and middleware
- **Controllers** (`/controllers`) - Handle request/response logic
- **Services** (`/services`) - Contain business logic and data processing
- **Models** (`/models`) - Define data schemas and database interactions
- **Validators** (`/validators`) - Handle input validation and sanitization
- **Middleware** (`/middleware`) - Custom middleware for auth, rate limiting, etc.
- **Utils** (`/utils`) - Reusable utility functions
- **Constants** (`/constants`) - Application-wide constants and messages

### **Benefits:**
- **Separation of Concerns** - Each layer has a specific responsibility
- **Testability** - Easy to unit test individual components
- **Reusability** - Services and utilities can be reused across routes
- **Maintainability** - Clean, organized code structure
- **Scalability** - Easy to add new features without affecting existing code
- **Consistency** - Standardized response formats and error handling

## 🚀 Features

- **Express.js** - Fast, unopinionated web framework
- **MongoDB & Mongoose** - Database and ODM
- **JWT Authentication** - Secure user authentication
- **bcrypt** - Password hashing
- **CORS** - Cross-origin resource sharing
- **Rate Limiting** - API rate limiting protection
- **Email Integration** - Nodemailer for email functionality
- **Serverless Ready** - Compatible with AWS Lambda, Vercel, etc.
- **Environment Configuration** - Secure environment variables

## 📁 Project Structure

```
backend/
├── app.js                    # Express app configuration
├── index.js                 # Server entry point (serverless + local)
├── package.json             # Dependencies and scripts
├── .env.example            # Environment variables template
├── .gitignore              # Git ignore rules
├── constants/              # Application constants
│   └── messages.js        # HTTP status codes and messages
├── controllers/           # Request/Response handling
│   └── authController.js # Authentication controller
├── middleware/           # Custom middleware
│   ├── auth.js          # JWT authentication middleware
│   └── rateLimiter.js   # Rate limiting middleware
├── models/              # Mongoose models
│   └── User.js         # User model with validation
├── routes/             # API route definitions
│   └── auth.js        # Authentication routes
├── services/          # Business logic layer
│   ├── authService.js # Authentication business logic
│   └── userService.js # User-related operations
├── utils/            # Utility functions
│   ├── email.js     # Email service and templates
│   └── responseHandler.js # Consistent API responses
└── validators/      # Input validation
    └── authValidator.js # Authentication validation
```

## 🛠️ Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Setup

Copy the environment template:
```bash
copy .env.example .env
```

Update the `.env` file with your configuration:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/social-media-platform

# Server
PORT=5000
NODE_ENV=development

# Client URL (for CORS)
CLIENT_URL=http://localhost:3000

# JWT
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=7d

# Email (Gmail example)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=your-email@gmail.com

# Security
BCRYPT_SALT_ROUNDS=12
```

### 3. Database Setup

Make sure MongoDB is running locally or update `MONGODB_URI` to point to your MongoDB Atlas cluster.

### 4. Run the Server

For development:
```bash
npm run dev
```

For production:
```bash
npm start
```

The server will be available at `http://localhost:5000`

## 📋 API Endpoints

### Authentication Routes (`/api/auth`)

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user profile (protected)

### Health Check

- `GET /` - Server status
- `GET /api/health` - Health check endpoint

## 🔧 API Usage Examples

### Register User
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "johndoe",
    "email": "john@example.com",
    "password": "password123",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

### Get Profile (with JWT token)
```bash
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 🚀 Serverless Deployment

This application is ready for serverless deployment:

### AWS Lambda
The `handler` export in `index.js` is compatible with AWS Lambda.

### Vercel
Create a `vercel.json` file:
```json
{
  "functions": {
    "index.js": {
      "runtime": "nodejs18.x"
    }
  }
}
```

### Netlify Functions
The serverless-http wrapper makes it compatible with Netlify Functions as well.

## 🔒 Security Features

- **Password Hashing**: bcrypt with configurable salt rounds
- **JWT Authentication**: Secure token-based authentication
- **Rate Limiting**: Protection against brute force attacks
- **CORS Configuration**: Secure cross-origin requests
- **Input Validation**: Mongoose schema validation
- **Environment Variables**: Secure configuration management

## 🧪 Testing

Test the API endpoints using tools like:
- **Postman** - API testing tool
- **curl** - Command line HTTP client
- **Thunder Client** - VS Code extension

## 📝 Next Steps

1. Create user routes (`/routes/users.js`)
2. Create post routes (`/routes/posts.js`)
3. Add file upload functionality
4. Implement real-time features with Socket.io
5. Add comprehensive testing
6. Set up CI/CD pipeline

## 📄 License

ISC License - see package.json for details.
