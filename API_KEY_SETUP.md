# Email Validation Setup Instructions

## Setting up Abstract Email API Key

1. **Get your API Key from Abstract**:
   - Go to [Abstract API](https://www.abstractapi.com/api/email-validation-api)
   - Sign up for a free account
   - Navigate to the Email Validation API dashboard
   - Copy your unique API key

2. **Add to your .env file**:
   ```env
   ABSTRACT_EMAIL_API_KEY=your_api_key_here
   ```

3. **Test the integration**:
   ```bash
   # Test email validation with API
   node tests/registrationEmailValidationTest.js email
   
   # Test full registration flow
   node tests/registrationEmailValidationTest.js full
   ```

## Example .env Configuration

```env
# ... other environment variables ...

# Abstract Email Validation API Key
ABSTRACT_EMAIL_API_KEY=abcd1234567890abcd1234567890abcd

# ... rest of your configuration ...
```

## Verification

Once configured, you should see API responses instead of fallback messages:

```
📧 Testing: user@gmail.com
✅ Valid: true
📊 Details:
   - Deliverability: DELIVERABLE
   - Quality Score: 0.9
   - Valid Format: true
   - Disposable: false
   - Free Email: true
```

## Without API Key (Current State)

The system currently shows:
```
Abstract Email API key not configured, falling back to basic validation
```

This is expected behavior and registration will still work with basic email format validation.
