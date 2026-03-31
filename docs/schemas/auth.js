/**
 * @swagger
 * components:
 *   schemas:
 *     # Request schemas
 *     RegisterRequest:
 *       type: object
 *       required:
 *         - email
 *         - password
 *         - name
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: User's email address
 *           example: user@example.com
 *         password:
 *           type: string
 *           format: password
 *           minLength: 8
 *           description: User's password (minimum 8 characters)
 *           example: SecurePass123!
 *         name:
 *           type: string
 *           minLength: 2
 *           maxLength: 50
 *           description: User's full name
 *           example: John Doe
 *     
 *     LoginRequest:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: User's email address
 *           example: user@example.com
 *         password:
 *           type: string
 *           format: password
 *           description: User's password
 *           example: SecurePass123!
 *     
 *     ForgotPasswordRequest:
 *       type: object
 *       required:
 *         - email
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: Email address to send reset instructions
 *           example: user@example.com
 *     
 *     ResetPasswordRequest:
 *       type: object
 *       required:
 *         - token
 *         - newPassword
 *       properties:
 *         token:
 *           type: string
 *           description: Password reset token from email
 *           example: abc123def456ghi789jkl012mno345pqr678stu901vwx234yz
 *         newPassword:
 *           type: string
 *           format: password
 *           minLength: 8
 *           description: New password (minimum 8 characters)
 *           example: NewSecurePass456!
 *     
 *     VerifyEmailRequest:
 *       type: object
 *       required:
 *         - token
 *       properties:
 *         token:
 *           type: string
 *           description: Email verification token
 *           example: abc123def456ghi789jkl012mno345pqr678stu901vwx234yz
 *     
 *     RefreshTokenRequest:
 *       type: object
 *       required:
 *         - refreshToken
 *       properties:
 *         refreshToken:
 *           type: string
 *           description: JWT refresh token
 *           example: mock-jwt-refresh-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *     
 *     # Response schemas
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: Unique user identifier
 *           example: 1
 *         email:
 *           type: string
 *           format: email
 *           description: User's email address
 *           example: user@example.com
 *         name:
 *           type: string
 *           description: User's full name
 *           example: John Doe
 *         emailVerified:
 *           type: boolean
 *           description: Whether the user's email is verified
 *           example: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Account creation timestamp
 *           example: 2023-01-01T12:00:00.000Z
 *     
 *     Tokens:
 *       type: object
 *       properties:
 *         accessToken:
 *           type: string
 *           description: JWT access token for API authentication
 *           example: mock-jwt-access-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *         refreshToken:
 *           type: string
 *           description: JWT refresh token for obtaining new access tokens
 *           example: mock-jwt-refresh-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *     
 *     RegisterResponse:
 *       allOf:
 *         - $ref: '#/components/schemas/SuccessResponse'
 *         - type: object
 *           properties:
 *             data:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *                 message:
 *                   type: string
 *                   example: Please check your email to verify your account
 *     
 *     LoginResponse:
 *       allOf:
 *         - $ref: '#/components/schemas/SuccessResponse'
 *         - type: object
 *           properties:
 *             data:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *                 tokens:
 *                   $ref: '#/components/schemas/Tokens'
 *     
 *     ForgotPasswordResponse:
 *       allOf:
 *         - $ref: '#/components/schemas/SuccessResponse'
 *         - type: object
 *           properties:
 *             data:
 *               type: object
 *               properties:
 *                 email:
 *                   type: string
 *                   format: email
 *                   example: user@example.com
 *                 expiresIn:
 *                   type: string
 *                   example: 1 hour
 *     
 *     ResetPasswordResponse:
 *       allOf:
 *         - $ref: '#/components/schemas/SuccessResponse'
 *         - type: object
 *           properties:
 *             data:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: You can now login with your new password
 *     
 *     VerifyEmailResponse:
 *       allOf:
 *         - $ref: '#/components/schemas/SuccessResponse'
 *         - type: object
 *           properties:
 *             data:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Your account is now fully activated
 *     
 *     RefreshTokenResponse:
 *       allOf:
 *         - $ref: '#/components/schemas/SuccessResponse'
 *         - type: object
 *           properties:
 *             data:
 *               type: object
 *               properties:
 *                 tokens:
 *                   $ref: '#/components/schemas/Tokens'
 */