/**
 * @swagger
 * components:
 *   schemas:
 *     # User management schemas
 *     ChangePasswordRequest:
 *       type: object
 *       required:
 *         - currentPassword
 *         - newPassword
 *       properties:
 *         currentPassword:
 *           type: string
 *           format: password
 *           description: Current password for verification
 *           example: CurrentPass123!
 *         newPassword:
 *           type: string
 *           format: password
 *           minLength: 8
 *           description: New password (minimum 8 characters)
 *           example: NewSecurePass456!
 *     
 *     UpdateProfileRequest:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           minLength: 2
 *           maxLength: 50
 *           description: User's full name
 *           example: Jane Smith
 *         email:
 *           type: string
 *           format: email
 *           description: User's email address
 *           example: jane.smith@example.com
 *     
 *     UserListQuery:
 *       type: object
 *       properties:
 *         page:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *           description: Page number for pagination
 *           example: 1
 *         limit:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *           description: Number of users per page
 *           example: 10
 *         search:
 *           type: string
 *           description: Search term for filtering users by name or email
 *           example: john
 *         sortBy:
 *           type: string
 *           enum: [name, email, createdAt]
 *           default: createdAt
 *           description: Field to sort by
 *           example: name
 *         sortOrder:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *           description: Sort order
 *           example: asc
 *     
 *     # Response schemas
 *     UserProfile:
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
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Last profile update timestamp
 *           example: 2023-01-15T10:30:00.000Z
 *     
 *     PaginationMeta:
 *       type: object
 *       properties:
 *         page:
 *           type: integer
 *           description: Current page number
 *           example: 1
 *         limit:
 *           type: integer
 *           description: Number of items per page
 *           example: 10
 *         total:
 *           type: integer
 *           description: Total number of items
 *           example: 25
 *         pages:
 *           type: integer
 *           description: Total number of pages
 *           example: 3
 *         hasNext:
 *           type: boolean
 *           description: Whether there are more pages
 *           example: true
 *         hasPrev:
 *           type: boolean
 *           description: Whether there are previous pages
 *           example: false
 *     
 *     UserListResponse:
 *       allOf:
 *         - $ref: '#/components/schemas/SuccessResponse'
 *         - type: object
 *           properties:
 *             data:
 *               type: object
 *               properties:
 *                 users:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/UserProfile'
 *                 pagination:
 *                   $ref: '#/components/schemas/PaginationMeta'
 *     
 *     UserProfileResponse:
 *       allOf:
 *         - $ref: '#/components/schemas/SuccessResponse'
 *         - type: object
 *           properties:
 *             data:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/UserProfile'
 *     
 *     ChangePasswordResponse:
 *       allOf:
 *         - $ref: '#/components/schemas/SuccessResponse'
 *         - type: object
 *           properties:
 *             data:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Password changed successfully
 *     
 *     DeleteAccountResponse:
 *       allOf:
 *         - $ref: '#/components/schemas/SuccessResponse'
 *         - type: object
 *           properties:
 *             data:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Account deleted successfully
 *                 deletedAt:
 *                   type: string
 *                   format: date-time
 *                   example: 2023-01-15T12:00:00.000Z
 */