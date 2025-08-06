# OTP-Based Password Reset System

## Overview
This document describes the OTP (One-Time Password) based password reset system implemented for the social media platform. The system uses email-based OTP verification for secure password recovery.

## System Architecture

### Components
1. **OTP Store** (`utils/otpStore.js`) - In-memory storage for OTPs with expiration
2. **Email Templates** (`utils/email.js`) - Templates for OTP and confirmation emails
3. **Request Info Utility** (`utils/requestInfo.js`) - Extract device and location information
4. **Validators** (`validators/authValidator.js`) - Input validation for all endpoints
5. **Service Layer** (`services/authService.js`) - Business logic implementation
6. **Controller Layer** (`controllers/authController.js`) - HTTP request handling

### Flow Diagram
```
[User] → [Forgot Password] → [OTP Email] → [Verify OTP] → [Reset Password] → [Confirmation Email]
```

## API Endpoints

### 1. POST `/api/auth/forgot-password`
Initiates password reset by sending OTP to user's email.

**Request Body:**
```json
{
  "email": "user@example.com",     // Optional - either email or username required
  "username": "username123"        // Optional - either email or username required
}
```

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "message": "Password reset OTP sent to your email"
  }
}
```

**Features:**
- Accepts either email or username (only one required)
- Generates 6-digit OTP with 12.5 minute expiration
- Sends styled email with OTP
- Returns success message regardless of user existence (security)
- Stores OTP in inactive state initially

### 2. POST `/api/auth/verify-otp`
Verifies the OTP and activates it for password reset.

**Request Body:**
```json
{
  "email": "user@example.com",
  "otp": "123456"
}
```

**Response (Success):**
```json
{
  "success": true,
  "email": "user@example.com",
  "username": "username123",
  "data": {
    "message": "OTP verified successfully"
  }
}
```

**Features:**
- Validates OTP format (6 digits)
- Checks OTP expiration (12.5 minutes)
- Marks OTP as active upon successful verification
- Required step before password reset

### 3. POST `/api/auth/reset-password`
Resets password using verified OTP.

**Request Body:**
```json
{
  "otp": "123456",
  "newPassword": "newSecurePassword123"
}
```

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "message": "Password has been reset successfully"
  }
}
```

**Features:**
- Validates new password (same rules as registration)
- Requires OTP to be active (verified)
- Hashes password with bcrypt
- Removes OTP after successful reset
- Sends confirmation email with security details
- Includes device and location information

## Security Features

### OTP Security
- **Expiration**: 12.5 minutes automatic expiration
- **Single Use**: OTP removed after successful password reset
- **Two-Stage Verification**: OTP must be verified before becoming active
- **Rate Limiting**: Built-in cleanup prevents memory overflow
- **Secure Generation**: Cryptographically random 6-digit codes

### Email Security
- **No Information Disclosure**: Same response whether email exists or not
- **Rich Security Context**: Password reset emails include device/location info
- **Professional Templates**: Styled HTML and fallback text versions
- **Clear Instructions**: User-friendly emails with security warnings

### Validation Security
- **Input Sanitization**: Comprehensive validation on all inputs
- **Format Validation**: Email, username, password, and OTP format checks
- **Error Handling**: Consistent error responses without information leakage

## Data Storage

### In-Memory OTP Store
```javascript
{
  "email@example.com": {
    "otp": "123456",
    "createdAt": Date,
    "expiresAt": Date,
    "isActive": false  // Initially false, true after verification
  }
}
```

### Features:
- **Auto-Cleanup**: Expired OTPs automatically removed every 5 minutes
- **Memory Efficient**: No persistent storage required
- **Fast Access**: O(1) lookup by email
- **Monitoring**: Built-in functions for debugging and monitoring

## Email Templates

### OTP Email
- Professional styling with centered OTP display
- Clear expiration warning (12.5 minutes)
- Security warnings about not sharing OTP
- Responsive design for mobile devices

### Password Reset Confirmation
- Success confirmation with timestamp
- Device information (browser/mobile type)
- Location information (IP-based)
- Security tips and contact information

## Error Handling

### Validation Errors (400)
- Missing required fields
- Invalid email format
- Invalid OTP format (must be 6 digits)
- Weak password validation

### Business Logic Errors (400)
- Invalid or expired OTP
- OTP not verified before reset
- User not found (internal only)

### System Errors (500)
- Email sending failures
- Database connection issues
- Internal server errors

## Configuration

### Environment Variables
```bash
# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM="Hash Social Media <noreply@hashsocial.com>"

# Security
BCRYPT_SALT_ROUNDS=12
NODE_ENV=production
```

## Testing

### Test Script
Run comprehensive tests with: `node test-otp-system.js`

**Tests Include:**
- ✅ Forgot password with email
- ✅ Forgot password with username
- ✅ OTP verification
- ✅ Invalid OTP rejection
- ✅ Password reset functionality
- ✅ Login with new password
- ✅ Validation error handling
- ✅ Cleanup and memory management

### Manual Testing
1. Start server: `npm run dev`
2. Use Postman/curl to test endpoints
3. Check email delivery
4. Verify OTP store cleanup

## Monitoring & Maintenance

### Logging
- OTP generation and sending logged
- Password reset attempts logged with device info
- Failed verification attempts logged
- Cleanup operations logged

### Monitoring Functions
```javascript
// Get active OTP count
otpStore.getActiveOTPCount()

// Get all active emails (debug only)
otpStore.getActiveEmails()

// Manual cleanup
otpStore.cleanupExpiredOTPs()
```

## Production Considerations

### Scalability
- For high-traffic applications, consider Redis for OTP storage
- Implement rate limiting on email sending
- Use email queuing system for better reliability

### Security Enhancements
- Add CAPTCHA for forgot password endpoint
- Implement progressive delays for failed attempts
- Log and monitor suspicious patterns
- Consider SMS as backup delivery method

### Performance
- Optimize email template generation
- Cache compiled templates
- Use connection pooling for email sending
- Monitor memory usage of OTP store

## Troubleshooting

### Common Issues
1. **Emails not sending**: Check SMTP configuration and credentials
2. **OTPs expiring too quickly**: Verify system clock synchronization
3. **Memory leaks**: Monitor OTP store size and cleanup frequency
4. **Validation failures**: Check input format requirements

### Debug Commands
```javascript
// Check OTP details (development only)
otpStore.getOTPDetails('email@example.com')

// Force cleanup
otpStore.cleanupExpiredOTPs()

// Check active OTP count
console.log('Active OTPs:', otpStore.getActiveOTPCount())
```

## Future Enhancements

### Possible Improvements
1. **Multi-factor Authentication**: SMS backup codes
2. **Progressive Security**: Account lockout after multiple failures
3. **Advanced Analytics**: Password reset pattern analysis
4. **Email Templates**: Multi-language support
5. **Mobile App**: Push notification delivery
6. **Enterprise Features**: Admin override capabilities

This system provides a secure, user-friendly password reset experience while maintaining high security standards and excellent user experience.
