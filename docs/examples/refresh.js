/**
 * @swagger
 * components:
 *   examples:
 *     # Logout examples
 *     LogoutSingleRequestExample:
 *       summary: Logout from current device
 *       value:
 *         refreshToken: mock-jwt-refresh-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *         logoutAll: false
 *     
 *     LogoutAllRequestExample:
 *       summary: Logout from all devices
 *       value:
 *         logoutAll: true
 *     
 *     LogoutSuccessExample:
 *       summary: Successful logout
 *       value:
 *         success: true
 *         message: Logged out successfully
 *         data:
 *           tokenRevoked: true
 *     
 *     LogoutAllSuccessExample:
 *       summary: Successful logout from all devices
 *       value:
 *         success: true
 *         message: Logged out from all devices (3 tokens revoked)
 *         data:
 *           tokensRevoked: 3
 *     
 *     # Token validation examples
 *     ValidateTokenRequestExample:
 *       summary: Token validation request
 *       value:
 *         refreshToken: mock-jwt-refresh-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *     
 *     ValidateTokenSuccessExample:
 *       summary: Valid token response
 *       value:
 *         success: true
 *         message: Token is valid
 *         data:
 *           valid: true
 *           userId: 1
 *           email: user@example.com
 *           expiresAt: "2023-01-31T12:00:00.000Z"
 *     
 *     ValidateTokenInvalidExample:
 *       summary: Invalid token response
 *       value:
 *         success: false
 *         error: Invalid or expired token
 *         code: AUTHENTICATION_ERROR
 *         data:
 *           valid: false
 *     
 *     # Active tokens examples
 *     ActiveTokensSuccessExample:
 *       summary: User's active tokens
 *       value:
 *         success: true
 *         message: Active tokens retrieved successfully
 *         data:
 *           tokens:
 *             - id: token-123-abc
 *               deviceInfo: Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0
 *               ipAddress: 192.168.1.100
 *               lastUsed: "2023-01-15T10:30:00.000Z"
 *               createdAt: "2023-01-01T12:00:00.000Z"
 *               expiresAt: "2023-01-31T12:00:00.000Z"
 *               isCurrentToken: true
 *             - id: token-456-def
 *               deviceInfo: Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) Safari/605.1
 *               ipAddress: 10.0.0.50
 *               lastUsed: "2023-01-14T09:15:00.000Z"
 *               createdAt: "2022-12-20T14:30:00.000Z"
 *               expiresAt: "2023-01-19T14:30:00.000Z"
 *               isCurrentToken: false
 *           count: 2
 *     
 *     # Revoke token examples
 *     RevokeTokenRequestExample:
 *       summary: Token revocation request
 *       value:
 *         refreshToken: mock-jwt-refresh-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *     
 *     RevokeTokenSuccessExample:
 *       summary: Successful token revocation
 *       value:
 *         success: true
 *         message: Token revoked successfully
 *         data:
 *           tokenRevoked: true
 *     
 *     RevokeTokenForbiddenExample:
 *       summary: Cannot revoke another user's token
 *       value:
 *         success: false
 *         error: Cannot revoke token belonging to another user
 *         code: AUTHORIZATION_ERROR
 */