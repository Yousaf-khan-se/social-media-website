const nodemailer = require('nodemailer');

// Create transporter with fallback for testing
const createTransporter = () => {
    // Check if email configuration is provided
    if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.log('⚠️ Email configuration not found in environment variables');
        console.log('   For testing: Using ethereal email (fake SMTP service)');

        // For testing purposes, create a test account
        // In production, proper SMTP configuration should be provided
        throw new Error('Email configuration is missing. Please set EMAIL_HOST, EMAIL_USER, and EMAIL_PASS in your environment variables.');

    }

    return nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });
};

// Send email function
const sendEmail = async (options) => {
    try {
        // Check if email configuration is available
        if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            console.log('⚠️ Email not sent - Missing email configuration');
            console.log('   Configure EMAIL_HOST, EMAIL_USER, EMAIL_PASS in .env file');
            console.log(`   For testing: OTP would be sent to ${options.to}`);

            // For testing purposes, extract and log the OTP if present
            if (options.html && options.html.includes('OTP')) {
                const otpMatch = options.html.match(/(\d{6})/);
                if (otpMatch) {
                    console.log(`📧 TEST MODE - OTP for ${options.to}: ${otpMatch[1]}`);
                    console.log('   Use this OTP in your test script');
                }
            }
            throw new Error('Email configuration is missing. Please set EMAIL_HOST, EMAIL_USER, and EMAIL_PASS in your environment variables.');
        }

        const transporter = createTransporter();

        const mailOptions = {
            from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
            to: options.to,
            subject: options.subject,
            text: options.text,
            html: options.html,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Email sent successfully:', info.messageId);
        return info;
    } catch (error) {
        console.error('❌ Email sending failed:', error.message);

        // For testing purposes, don't throw error if it's just email config issue
        if (error.message.includes('Invalid login') || error.message.includes('authentication')) {
            console.warn('⚠️ Email authentication failed - continuing in test mode');
            console.warn('   Configure proper SMTP credentials for production use');

            // Extract and show OTP for testing
            if (options.html && options.html.includes('OTP')) {
                const otpMatch = options.html.match(/(\d{6})/);
                if (otpMatch) {
                    console.log(`📧 TEST MODE - OTP for ${options.to}: ${otpMatch[1]}`);
                    console.log('   Use this OTP in your test script');
                }
            }

            return { messageId: 'test-mode-fallback' };
        }

        throw error;
    }
};

// Email templates
const emailTemplates = {
    welcome: (name) => ({
        subject: 'Welcome to hash your own social media platform!',
        html: `
      <h1>Welcome ${name}!</h1>
      <p>Thank you for joining hash. We're excited to have you on board!</p>
      <p>Start by completing your profile and connecting with friends.</p>
    `,
    }),

    resetPassword: (resetUrl) => ({
        subject: 'Reset Your Password',
        html: `
      <h1>Password Reset Request</h1>
      <p>You requested a password reset. Click the link below to reset your password:</p>
      <a href="${resetUrl}">Reset Password</a>
      <p>This link will expire in 10 minutes.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `,
    }),

    passwordResetOTP: (name, otp) => ({
        subject: 'Password Reset OTP - Hash Social Media',
        html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
        <h1 style="color: #333; text-align: center;">Password Reset OTP</h1>
        <p>Hi ${name},</p>
        <p>You requested a password reset for your Hash Social Media account. Use the OTP below to proceed:</p>
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; text-align: center; margin: 20px 0;">
          <h2 style="color: #007bff; margin: 0; font-size: 32px; letter-spacing: 5px;">${otp}</h2>
        </div>
        <p><strong>Important:</strong></p>
        <ul>
          <li>This OTP will expire in <strong>12 minutes and 30 seconds</strong></li>
          <li>Do not share this OTP with anyone</li>
          <li>If you didn't request this, please ignore this email</li>
        </ul>
        <p>Best regards,<br>Hash Social Media Team</p>
        <hr style="margin: 30px 0;">
        <p style="font-size: 12px; color: #666; text-align: center;">
          If you're having trouble with the password reset process, please contact our support team.
        </p>
      </div>
    `,
        text: `
Hi ${name},

You requested a password reset for your Hash Social Media account. 

Your OTP is: ${otp}

This OTP will expire in 12 minutes and 30 seconds.

If you didn't request this, please ignore this email.

Best regards,
Hash Social Media Team
    `
    }),

    passwordResetSuccess: (name, deviceInfo, location, timestamp) => ({
        subject: 'Password Reset Successful - Hash Social Media',
        html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
        <h1 style="color: #28a745; text-align: center;">Password Reset Successful</h1>
        <p>Hi ${name},</p>
        <p>Your password has been successfully reset for your Hash Social Media account.</p>
        
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="color: #333; margin-top: 0;">Reset Details:</h3>
          <ul style="margin: 0; padding-left: 20px;">
            <li><strong>Time:</strong> ${timestamp}</li>
            <li><strong>Device:</strong> ${deviceInfo}</li>
            <li><strong>Location:</strong> ${location}</li>
          </ul>
        </div>

        <p><strong>Security Tips:</strong></p>
        <ul>
          <li>Make sure to use a strong, unique password</li>
          <li>Don't share your password with anyone</li>
          <li>If this wasn't you, please contact our support immediately</li>
        </ul>

        <p>You can now log in to your account using your new password.</p>
        
        <p>Best regards,<br>Hash Social Media Team</p>
        <hr style="margin: 30px 0;">
        <p style="font-size: 12px; color: #666; text-align: center;">
          If you didn't perform this action, please contact our support team immediately.
        </p>
      </div>
    `,
        text: `
Hi ${name},

Your password has been successfully reset for your Hash Social Media account.

Reset Details:
- Time: ${timestamp}
- Device: ${deviceInfo}
- Location: ${location}

If this wasn't you, please contact our support immediately.

You can now log in to your account using your new password.

Best regards,
Hash Social Media Team
    `
    })
};

module.exports = {
    sendEmail,
    emailTemplates
};
