const axios = require('axios');
require('dotenv').config();

/**
 * Abstract Email Validator Service
 * Uses Abstract API for comprehensive email validation
 */
class AbstractEmailValidator {
    constructor() {
        this.apiKey = process.env.ABSTRACT_EMAIL_API_KEY;
        this.baseURL = 'https://emailvalidation.abstractapi.com/v1/';
        this.timeout = 10000; // 10 seconds timeout
    }

    /**
     * Validate email using Abstract API
     * @param {string} email - Email address to validate
     * @param {boolean} autoCorrect - Whether to enable auto correction (default: true)
     * @returns {Promise<Object>} Validation result
     */
    async validateEmail(email, autoCorrect = true) {
        try {
            // Check if API key is configured
            if (!this.apiKey) {
                console.warn('Abstract Email API key not configured, falling back to basic validation');
                return this.fallbackValidation(email);
            }

            const response = await axios.get(this.baseURL, {
                params: {
                    api_key: this.apiKey,
                    email: email,
                    auto_correct: autoCorrect
                },
                timeout: this.timeout
            });

            const validationData = response.data;

            // Process and return structured result
            return {
                success: true,
                email: validationData.email,
                isValid: this.isEmailValid(validationData),
                validationDetails: {
                    deliverability: validationData.deliverability,
                    qualityScore: validationData.quality_score,
                    isValidFormat: validationData.is_valid_format?.value || false,
                    isFreeEmail: validationData.is_free_email?.value || false,
                    isDisposableEmail: validationData.is_disposable_email?.value || false,
                    isRoleEmail: validationData.is_role_email?.value || false,
                    isCatchAllEmail: validationData.is_catchall_email?.value || false,
                    isMxFound: validationData.is_mx_found?.value || null,
                    isSmtpValid: validationData.is_smtp_valid?.value || null
                },
                autoCorrect: validationData.autocorrect || '',
                apiResponse: validationData
            };

        } catch (error) {
            console.error('Abstract Email API error:', error.message);

            // Handle specific API errors
            if (error.response) {
                const status = error.response.status;
                const errorData = error.response.data;

                switch (status) {
                    case 401:
                        console.error('Abstract API: Unauthorized - Check API key');
                        break;
                    case 422:
                        console.error('Abstract API: Quota reached');
                        break;
                    case 429:
                        console.error('Abstract API: Rate limit exceeded');
                        break;
                    case 500:
                    case 503:
                        console.error('Abstract API: Service unavailable');
                        break;
                }
            }

            // Fall back to basic validation on API failure
            console.warn('Falling back to basic email validation due to API error');
            return this.fallbackValidation(email);
        }
    }

    /**
     * Determine if email is valid based on Abstract API response
     * @param {Object} validationData - Response from Abstract API
     * @returns {boolean} Whether email is considered valid
     */
    isEmailValid(validationData) {
        // Must have valid format
        if (!validationData.is_valid_format?.value) {
            return false;
        }

        // Check deliverability
        const deliverability = validationData.deliverability;
        if (deliverability === 'UNDELIVERABLE') {
            return false;
        }

        // Block disposable emails (temporary email services)
        if (validationData.is_disposable_email?.value) {
            return false;
        }

        // For free plan, we accept DELIVERABLE and UNKNOWN
        // since SMTP validation is not available
        return deliverability === 'DELIVERABLE' || deliverability === 'UNKNOWN';
    }

    /**
     * Fallback validation when API is unavailable
     * @param {string} email - Email to validate
     * @returns {Object} Basic validation result
     */
    fallbackValidation(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const isValid = emailRegex.test(email);

        return {
            success: true,
            email: email,
            isValid: isValid,
            validationDetails: {
                deliverability: 'UNKNOWN',
                qualityScore: isValid ? 0.5 : 0.0,
                isValidFormat: isValid,
                isFreeEmail: null,
                isDisposableEmail: null,
                isRoleEmail: null,
                isCatchAllEmail: null,
                isMxFound: null,
                isSmtpValid: null
            },
            autoCorrect: '',
            fallback: true,
            apiResponse: null
        };
    }

    /**
     * Get human-readable validation error message
     * @param {Object} validationResult - Result from validateEmail
     * @returns {string} Error message or null if valid
     */
    getValidationError(validationResult) {
        if (validationResult.isValid) {
            return null;
        }

        const details = validationResult.validationDetails;

        if (!details.isValidFormat) {
            if (validationResult.autoCorrect) {
                return `Please provide a valid email address format. Did you mean: ${validationResult.autoCorrect}?`;
            }
            return 'Please provide a valid email address format';
        }

        if (details.deliverability === 'UNDELIVERABLE') {
            if (validationResult.autoCorrect) {
                return `This email address appears to be undeliverable. Did you mean: ${validationResult.autoCorrect}?`;
            }
            return 'This email address appears to be undeliverable';
        }

        if (details.isDisposableEmail) {
            return 'Temporary or disposable email addresses are not allowed';
        }

        return 'Please provide a valid email address';
    }

    /**
     * Quick validation for basic checks
     * @param {string} email - Email to validate
     * @returns {Promise<boolean>} Whether email is valid
     */
    async isValidEmail(email) {
        const result = await this.validateEmail(email);
        return result.isValid;
    }
}

// Create singleton instance
const emailValidator = new AbstractEmailValidator();

module.exports = {
    validateEmail: emailValidator.validateEmail.bind(emailValidator),
    isValidEmail: emailValidator.isValidEmail.bind(emailValidator),
    getValidationError: emailValidator.getValidationError.bind(emailValidator),
    AbstractEmailValidator
};