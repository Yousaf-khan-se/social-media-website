const nodemailer = require('nodemailer');

// Create transporter
const createTransporter = () => {
    return nodemailer.createTransporter({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        secure: false, // true for 465, false for other ports
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });
};

// Send email function
const sendEmail = async (options) => {
    try {
        const transporter = createTransporter();

        const mailOptions = {
            from: process.env.EMAIL_FROM,
            to: options.to,
            subject: options.subject,
            text: options.text,
            html: options.html,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent:', info.messageId);
        return info;
    } catch (error) {
        console.error('Email sending failed:', error);
        throw error;
    }
};

// Email templates
const emailTemplates = {
    welcome: (name) => ({
        subject: 'Welcome to Social Media Platform!',
        html: `
      <h1>Welcome ${name}!</h1>
      <p>Thank you for joining our social media platform. We're excited to have you on board!</p>
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
};

module.exports = {
    sendEmail,
    emailTemplates
};
