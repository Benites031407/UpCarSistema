export { jwtService } from './jwt.js';
export type { JWTPayload } from './jwt.js';
export { passwordService } from './password.js';
export { redisSessionManager } from './redis.js';
export { configureGoogleAuth, passport } from './google.js';
export { 
  authenticateToken, 
  optionalAuth, 
  requireAuth, 
  requireAdmin
} from './middleware.js';
export type { AuthenticatedRequest } from './middleware.js';
export { 
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  changePasswordSchema,
  updateProfileSchema
} from './validation.js';
export type {
  RegisterInput,
  LoginInput,
  RefreshTokenInput,
  ChangePasswordInput,
  UpdateProfileInput
} from './validation.js';
export { default as authRouter } from './routes.js';