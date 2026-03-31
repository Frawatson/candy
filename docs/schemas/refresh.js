/**
 * @swagger
 * components:
 *   schemas:
 *     # Refresh token management schemas
 *     LogoutRequest:
 *       type: object
 *       properties:
 *         refreshToken:
 *           type: string
 *           description: Refresh token to blacklist (optional if logoutAll is true)
 *           example: mock-jwt-refresh-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *         logoutAll:
 *           type: boolean
 *           default: false
 *           description: Whether to logout from all devices
 *           example: false
 *     
 *     RevokeTokenRequest:
 *       type: object
 *       required:
 *         - refreshToken
 *       properties:
 *         refreshToken:
 *           type: string
 *           description: Refresh token to revoke
 *           example: mock-jwt-refresh-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *     
 *     ValidateTokenRequest:
 *       type: object
 *       required:
 *         - refreshToken
 *       properties:
 *         refreshToken:
 *           type: string
 *           description: Refresh token to validate
 *           example: mock-jwt-refresh-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *     
 *     # Response schemas
 *     ActiveToken:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Token identifier
 *           example: abc123-def456-ghi789
 *         deviceInfo:
 *           type: string
 *           description: Device information
 *           example: Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0
 *         ipAddress:
 *           type: string
 *           description: IP address where token was created
 *           example: 192.168.1.100
 *         lastUsed:
 *           type: string
 *           format: date-time
 *           description: Last time token was used
 *           example: 2023-01-15T10:30:00.000Z
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Token creation timestamp
 *           example: 2023-01-01T12:00:00.000Z
 *         expiresAt:
 *           type: string
 *           format: date-time
 *           description: Token expiration timestamp
 *           example: 2023-01-31T12:00:00.000Z
 *         isCurrentToken:
 *           type: boolean
 *           description: Whether this is the current request's token
 *           example: true
 *     
 *     LogoutResponse:
 *       allOf:
 *         - $ref: '#/components/schemas/SuccessResponse'
 *         - type: object
 *           properties:
 *             data:
 *               type: object
 *               properties:
 *                 tokenRevoked:
 *                   type: boolean
 *                   description: Whether token was successfully revoked
 *                   example: true
 *                 tokensRevoked:
 *                   type: integer
 *                   description: Number of tokens revoked (for logout all)
 *                   example: 3
 *     
 *     ActiveTokensResponse:
 *       allOf:
 *         - $ref: '#/components/schemas/SuccessResponse'
 *         - type: object
 *           properties:
 *             data:
 *               type: object
 *               properties:
 *                 tokens:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ActiveToken'
 *                 count:
 *                   type: integer
 *                   description: Number of active tokens
 *                   example: 2
 *     
 *     ValidateTokenResponse:
 *       allOf:
 *         - $ref: '#/components/schemas/SuccessResponse'
 *         - type: object
 *           properties:
 *             data:
 *               type: object
 *               properties:
 *                 valid:
 *                   type: boolean
 *                   description: Whether the token is valid
 *                   example: true
 *                 userId:
 *                   type: integer
 *                   description: User ID associated with the token
 *                   example: 1
 *                 email:
 *                   type: string
 *                   format: email
 *                   description: Email associated with the token
 *                   example: user@example.com
 *                 expiresAt:
 *                   type: string
 *                   format: date-time
 *                   description: Token expiration timestamp
 *                   example: 2023-01-31T12:00:00.000Z
 */