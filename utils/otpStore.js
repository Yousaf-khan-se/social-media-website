// In-memory OTP storage with expiration
// This stores OTPs temporarily with email mapping and status

class OTPStore {
    constructor() {
        this.otps = new Map(); // Map<email, { otp, createdAt, isActive, expiresAt }>
        this.ACTIVATION_TIME = 61 * 1000; // 61 seconds in milliseconds
        this.EXPIRY_TIME = 12.1 * 60 * 1000; // 12 minutes 10 seconds in milliseconds

        // Clean up expired OTPs every 5 minutes
        setInterval(() => {
            this.cleanupExpiredOTPs();
        }, 5 * 60 * 1000);
    }

    // Generate a 6-digit OTP
    generateOTP() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    // Store OTP for email with inactive status
    storeOTP(email, username, otp = null) {
        const otpCode = otp || this.generateOTP();
        const now = new Date();
        const expiresAt = new Date(now.getTime() + this.ACTIVATION_TIME);

        this.otps.set(email, {
            otp: otpCode,
            createdAt: now,
            expiresAt: expiresAt,
            isActive: false, // Initially inactive until verified,
            username: username
        });

        return otpCode;
    }

    // Verify OTP and mark as active if correct
    verifyOTP(email, otp) {
        const storedOTP = this.otps.get(email);

        if (!storedOTP) {
            return { success: false, message: 'OTP not found or expired' };
        }

        // Check if OTP has expired
        if (new Date() > storedOTP.expiresAt) {
            this.otps.delete(email);
            return { success: false, message: 'OTP has expired' };
        }

        // Check if OTP matches
        if (storedOTP.otp !== otp) {
            return { success: false, message: 'Invalid OTP' };
        }

        // Mark OTP as active
        storedOTP.isActive = true;
        storedOTP.expiresAt = new Date(new Date().getTime() + this.EXPIRY_TIME); // Extend expiry after verification
        this.otps.set(email, storedOTP);

        return { success: true, message: 'OTP verified successfully' };
    }

    // Check if OTP is active and valid
    isOTPActive(email, otp) {
        const storedOTP = this.otps.get(email);

        if (!storedOTP) {
            return false;
        }

        // Check if OTP has expired
        if (new Date() > storedOTP.expiresAt) {
            this.otps.delete(email);
            return false;
        }

        // Check if OTP matches and is active
        return storedOTP.otp === otp && storedOTP.isActive;
    }

    // Get OTP details (for debugging - should not be used in production)
    getOTPDetails(email) {
        return this.otps.get(email);
    }

    // Remove OTP after successful password reset
    removeOTP(email) {
        this.otps.delete(email);
    }

    // Clean up expired OTPs
    cleanupExpiredOTPs() {
        const now = new Date();
        let cleanedCount = 0;

        for (const [email, otpData] of this.otps) {
            if (now > otpData.expiresAt) {
                this.otps.delete(email);
                cleanedCount++;
            }
        }

        if (cleanedCount > 0) {
            console.log(`Cleaned up ${cleanedCount} expired OTPs`);
        }
    }

    // Get current OTP count (for monitoring)
    getActiveOTPCount() {
        return this.otps.size;
    }

    // get opts username
    getOTPUsername(email) {
        const otpData = this.otps.get(email);
        return otpData ? otpData.username : null;
    }

    // Get all active emails (for debugging - should not be used in production)
    getActiveEmails() {
        return Array.from(this.otps.keys());
    }
}

// Create singleton instance
const otpStore = new OTPStore();

module.exports = otpStore;
