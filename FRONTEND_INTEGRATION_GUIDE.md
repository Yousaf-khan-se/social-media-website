# Frontend Integration Guide - OTP Password Reset

## API Integration Examples

### 1. Forgot Password Request

```javascript
// Frontend function to request password reset
const requestPasswordReset = async (emailOrUsername) => {
  try {
    const response = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: emailOrUsername.includes('@') ? emailOrUsername : undefined,
        username: !emailOrUsername.includes('@') ? emailOrUsername : undefined
      })
    });

    const data = await response.json();
    
    if (response.ok) {
      // Show success message - OTP sent
      showNotification('success', 'Password reset OTP sent to your email');
      // Redirect to OTP verification page
      window.location.href = '/verify-otp';
    } else {
      // Handle errors
      showNotification('error', data.error || 'Failed to send reset email');
    }
  } catch (error) {
    showNotification('error', 'Network error. Please try again.');
  }
};
```

### 2. OTP Verification

```javascript
// Frontend function to verify OTP
const verifyOTP = async (email, otp) => {
  try {
    const response = await fetch('/api/auth/verify-otp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: email,
        otp: otp
      })
    });

    const data = await response.json();
    
    if (response.ok) {
      // OTP verified successfully
      showNotification('success', 'OTP verified! You can now reset your password.');
      // Store verified OTP temporarily for password reset
      sessionStorage.setItem('verifiedOTP', otp);
      sessionStorage.setItem('resetEmail', email);
      // Redirect to password reset page
      window.location.href = '/reset-password';
    } else {
      // Handle errors
      if (data.error.includes('expired')) {
        showNotification('error', 'OTP has expired. Please request a new one.');
      } else {
        showNotification('error', data.error || 'Invalid OTP');
      }
    }
  } catch (error) {
    showNotification('error', 'Network error. Please try again.');
  }
};
```

### 3. Password Reset

```javascript
// Frontend function to reset password
const resetPassword = async (otp, newPassword) => {
  try {
    const response = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        otp: otp,
        newPassword: newPassword
      })
    });

    const data = await response.json();
    
    if (response.ok) {
      // Password reset successful
      showNotification('success', 'Password reset successful! You can now log in.');
      // Clear temporary data
      sessionStorage.removeItem('verifiedOTP');
      sessionStorage.removeItem('resetEmail');
      // Redirect to login page
      window.location.href = '/login';
    } else {
      // Handle errors
      showNotification('error', data.error || 'Failed to reset password');
    }
  } catch (error) {
    showNotification('error', 'Network error. Please try again.');
  }
};
```

## React Component Examples

### 1. Forgot Password Form

```jsx
import React, { useState } from 'react';

const ForgotPasswordForm = () => {
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailOrUsername.includes('@') ? emailOrUsername : undefined,
          username: !emailOrUsername.includes('@') ? emailOrUsername : undefined
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        setMessage({ type: 'success', text: data.data.message });
        // Store email for next step
        sessionStorage.setItem('resetEmail', 
          emailOrUsername.includes('@') ? emailOrUsername : data.data.email
        );
      } else {
        setMessage({ type: 'error', text: data.error });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error occurred' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forgot-password-form">
      <h2>Reset Your Password</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Email or Username:</label>
          <input
            type="text"
            value={emailOrUsername}
            onChange={(e) => setEmailOrUsername(e.target.value)}
            placeholder="Enter your email or username"
            required
          />
        </div>
        
        <button type="submit" disabled={loading}>
          {loading ? 'Sending...' : 'Send Reset OTP'}
        </button>
      </form>

      {message && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}
    </div>
  );
};
```

### 2. OTP Verification Form

```jsx
import React, { useState, useEffect } from 'react';

const OTPVerificationForm = () => {
  const [otp, setOtp] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [timeLeft, setTimeLeft] = useState(750); // 12.5 minutes in seconds

  useEffect(() => {
    // Get email from previous step
    const storedEmail = sessionStorage.getItem('resetEmail');
    if (storedEmail) {
      setEmail(storedEmail);
    }

    // Countdown timer
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp })
      });

      const data = await response.json();
      
      if (response.ok) {
        setMessage({ type: 'success', text: data.data.message });
        sessionStorage.setItem('verifiedOTP', otp);
        // Redirect to password reset
        setTimeout(() => window.location.href = '/reset-password', 1500);
      } else {
        setMessage({ type: 'error', text: data.error });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error occurred' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="otp-verification-form">
      <h2>Verify OTP</h2>
      <p>Enter the 6-digit code sent to: <strong>{email}</strong></p>
      
      <div className="timer">
        Time remaining: <strong>{formatTime(timeLeft)}</strong>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>OTP Code:</label>
          <input
            type="text"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            maxLength={6}
            pattern="\d{6}"
            required
          />
        </div>
        
        <button type="submit" disabled={loading || timeLeft === 0}>
          {loading ? 'Verifying...' : 'Verify OTP'}
        </button>
      </form>

      {message && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}

      {timeLeft === 0 && (
        <button onClick={() => window.location.href = '/forgot-password'}>
          Request New OTP
        </button>
      )}
    </div>
  );
};
```

### 3. Password Reset Form

```jsx
import React, { useState, useEffect } from 'react';

const PasswordResetForm = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [otp, setOtp] = useState('');

  useEffect(() => {
    // Get verified OTP from previous step
    const verifiedOTP = sessionStorage.getItem('verifiedOTP');
    if (!verifiedOTP) {
      // Redirect if no verified OTP
      window.location.href = '/forgot-password';
      return;
    }
    setOtp(verifiedOTP);
  }, []);

  const validatePassword = (password) => {
    if (password.length < 6) {
      return 'Password must be at least 6 characters long';
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    // Validate passwords
    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      setMessage({ type: 'error', text: passwordError });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match' });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp, newPassword })
      });

      const data = await response.json();
      
      if (response.ok) {
        setMessage({ type: 'success', text: data.data.message });
        // Clear session data
        sessionStorage.removeItem('verifiedOTP');
        sessionStorage.removeItem('resetEmail');
        // Redirect to login
        setTimeout(() => window.location.href = '/login', 2000);
      } else {
        setMessage({ type: 'error', text: data.error });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error occurred' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="password-reset-form">
      <h2>Reset Your Password</h2>
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>New Password:</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Enter new password"
            minLength={6}
            required
          />
        </div>

        <div className="form-group">
          <label>Confirm Password:</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
            minLength={6}
            required
          />
        </div>
        
        <button type="submit" disabled={loading}>
          {loading ? 'Resetting...' : 'Reset Password'}
        </button>
      </form>

      {message && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}
    </div>
  );
};
```

## CSS Styling Example

```css
.forgot-password-form,
.otp-verification-form,
.password-reset-form {
  max-width: 400px;
  margin: 2rem auto;
  padding: 2rem;
  border: 1px solid #ddd;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: #333;
}

.form-group input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 1rem;
}

.form-group input:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0,123,255,0.25);
}

button {
  width: 100%;
  padding: 0.75rem;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

button:hover:not(:disabled) {
  background-color: #0056b3;
}

button:disabled {
  background-color: #6c757d;
  cursor: not-allowed;
}

.message {
  margin-top: 1rem;
  padding: 0.75rem;
  border-radius: 4px;
  font-weight: 500;
}

.message.success {
  background-color: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.message.error {
  background-color: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}

.timer {
  text-align: center;
  margin: 1rem 0;
  font-size: 1.1rem;
  color: #666;
}

.timer strong {
  color: #dc3545;
}
```

This integration guide provides everything needed to implement the OTP password reset system on the frontend with proper error handling, validation, and user experience considerations.
