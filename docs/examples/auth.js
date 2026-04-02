/**
 * @swagger
 * components:
 *   examples:
 *     # Register examples
 *     RegisterRequestExample:
 *       summary: User registration request
 *       value:
 *         email: john.doe@example.com
 *         password: SecurePass123!
 *         name: John Doe
 *     
 *     RegisterSuccessExample:
 *       summary: Successful registration response
 *       value:
 *         success: true
 *         message: User registered successfully
 *         data:
 *           user:
 *             id: 123
 *             email: john.doe@example.com
 *             name: John Doe
 *             emailVerified: false
 *             createdAt: "2023-01-15T12:00:00.000Z"
 *           message: Please check your email to verify your account
 *     
 *     RegisterConflictExample:
 *       summary: Email already exists error
 *       value:
 *         success: false
 *         error: User already exists with this email
 *         code: CONFLICT_ERROR
 *         correlationId: req-123-abc-456
 *     
 *     # Login examples
 *     LoginRequestExample:
 *       summary: User login request
 *       value:
 *         email: test@example.com
 *         password: password123
 *     
 *     LoginSuccessExample:
 *       summary: Successful login response
 *       value:
 *         success: true
 *         message: Login successful
 *         data:
 *           user:
 *             id: 1
 *             email: test@example.com
 *             name: Test User
 *             emailVerified: true
 *           tokens:
 *             accessToken: mock-jwt-access-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *             refreshToken: mock-jwt-refresh-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *     
 *     LoginFailureExample:
 *       summary: Invalid credentials error
 *       value:
 *         success: false
 *         error: Invalid email or password
 *         code: AUTHENTICATION_ERROR
 *         correlationId: req-456-def-789
 *     
 *     # Password reset examples
 *     ForgotPasswordRequestExample:
 *       summary: Password reset request
 *       value:
 *         email: user@example.com
 *     
 *     ForgotPasswordSuccessExample:
 *       summary: Successful password reset request
 *       value:
 *         success: true
 *         message: Password reset instructions sent to your email
 *         data:
 *           email: user@example.com
 *           expiresIn: 1 hour
 *     
 *     ForgotPasswordNotFoundExample:
 *       summary: Email not found error
 *       value:
 *         success: false
 *         error: No user found with this email address
 *         code: NOT_FOUND
 *         correlationId: req-789-ghi-012
 *     
 *     ResetPasswordRequestExample:
 *       summary: Password reset with token
 *       value:
 *         token: abc123def456ghi789jkl012mno345pqr678stu901vwx234yz
 *         newPassword: NewSecurePass456!
 *     
 *     ResetPasswordSuccessExample:
 *       summary: Successful password reset
 *       value:
 *         success: true
 *         message: Password reset successfully
 *         data:
 *           message: You can now login with your new password
 *     
 *     ResetPasswordInvalidTokenExample:
 *       summary: Invalid reset token error
 *       value:
 *         success: false
 *         error: Invalid or expired reset token
 *         code: AUTHENTICATION_ERROR
 *         correlationId: req-012-jkl-345
 *     
 *     # Email verification examples
 *     VerifyEmailRequestExample:
 *       summary: Email verification request
 *       value:
 *         token: def456ghi789jkl012mno345pqr678stu901vwx234yza123
 *     
 *     VerifyEmailSuccessExample:
 *       summary: Successful email verification
 *       value:
 *         success: true
 *         message: Email verified successfully
 *         data:
 *           message: Your account is now fully activated
 *     
 *     VerifyEmailInvalidTokenExample:
 *       summary: Invalid verification token error
 *       value:
 *         success: false
 *         error: Invalid or expired verification token
 *         code: AUTHENTICATION_ERROR
 *         correlationId: req-345-mno-678
 *     
 *     # Token refresh examples
 *     RefreshTokenRequestExample:
 *       summary: Token refresh request
 *       value:
 *         refreshToken: mock-jwt-refresh-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *     
 *     RefreshTokenSuccessExample:
 *       summary: Successful token refresh
 *       value:
 *         success: true
 *         message: Token refreshed successfully
 *         data:
 *           tokens:
 *             accessToken: mock-jwt-access-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *             refreshToken: mock-jwt-refresh-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *     
 *     RefreshTokenInvalidExample:
 *       summary: Invalid refresh token error
 *       value:
 *         success: false
 *         error: Invalid refresh token
 *         code: AUTHENTICATION_ERROR
 *         correlationId: req-678-pqr-901
 */