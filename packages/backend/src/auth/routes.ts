import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import rateLimit from 'express-rate-limit';
import { PostgresUserRepository } from '../repositories/user.js';
import { User as AppUser } from '../models/types.js';
import { jwtService } from './jwt.js';
import { passwordService } from './password.js';
import { redisSessionManager } from './redis.js';
import { passport, configureGoogleAuth } from './google.js';
import { authenticateToken } from './middleware.js';
import { 
  registerSchema, 
  loginSchema, 
  refreshTokenSchema, 
  changePasswordSchema,
  updateProfileSchema,
  RegisterInput,
  LoginInput,
  RefreshTokenInput,
  ChangePasswordInput,
  UpdateProfileInput
} from './validation.js';
import { createLogger } from '../utils/logger.js';
import { auditOperations } from '../middleware/auditLog.js';
import { createSecureSession } from './sessionSecurity.js';
import { emailService } from '../services/emailService.js';
import crypto from 'crypto';

const logger = createLogger('auth-routes');
const userRepository = new PostgresUserRepository();

// Configure Google OAuth
configureGoogleAuth();

// Rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: { error: 'Muitas tentativas de autenticação, por favor tente novamente mais tarde' },
  standardHeaders: true,
  legacyHeaders: false,
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
});

export const authRouter = Router();

// Apply rate limiting
authRouter.use('/login', authLimiter);
authRouter.use('/register', authLimiter);
authRouter.use(generalLimiter);

// Initialize passport
authRouter.use(passport.initialize());

// Validation middleware
function validateRequest(schema: any) {
  return (req: Request, res: Response, next: any) => {
    try {
      const result = schema.parse(req.body);
      req.body = result;
      next();
    } catch (error: any) {
      res.status(400).json({
        error: 'Falha na validação',
        details: error.errors?.map((e: any) => ({
          field: e.path.join('.'),
          message: e.message
        })) || []
      });
    }
  };
}

// Register endpoint
authRouter.post('/register', validateRequest(registerSchema), async (req: Request, res: Response) => {
  try {
    const { email, password, name }: RegisterInput = req.body;

    // Check if user already exists
    const existingUser = await userRepository.findByEmail(email);
    if (existingUser) {
      res.status(409).json({ error: 'Já existe um usuário com este email' });
      return;
    }

    // Validate password strength
    const passwordValidation = passwordService.validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      res.status(400).json({
        error: 'Falha na validação da senha',
        details: passwordValidation.errors
      });
      return;
    }

    // Hash password
    const passwordHash = await passwordService.hashPassword(password);

    // Create user
    const user = await userRepository.create({
      email,
      name,
      passwordHash,
      accountBalance: 0,
      subscriptionStatus: 'none'
    });

    // Generate tokens
    const accessToken = jwtService.generateAccessToken(user);
    const refreshToken = jwtService.generateRefreshToken(user);

    // Create secure session with timestamp matching JWT iat (in seconds)
    const iat = Math.floor(Date.now() / 1000);
    const sessionId = `${user.id}-${iat}`;
    await createSecureSession(user.id, req, sessionId);

    // Store refresh token
    const refreshTokenId = uuidv4();
    await redisSessionManager.storeRefreshToken(refreshTokenId, user.id, refreshToken);

    // Audit log successful registration
    auditOperations.login(req, true, email);

    logger.info(`User registered successfully: ${email}`);

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        accountBalance: user.accountBalance,
        subscriptionStatus: user.subscriptionStatus
      },
      accessToken,
      refreshToken: refreshTokenId
    });
  } catch (error) {
    // Audit log failed registration
    auditOperations.login(req, false, req.body.email, 'Registration failed');
    
    logger.error('Registration error:', error);
    res.status(500).json({ error: 'Falha no cadastro' });
  }
});

// Login endpoint
authRouter.post('/login', validateRequest(loginSchema), async (req: Request, res: Response) => {
  try {
    const { email, password }: LoginInput = req.body;

    // Find user by email
    const user = await userRepository.findByEmail(email);
    if (!user || !user.passwordHash) {
      auditOperations.login(req, false, email, 'User not found');
      res.status(401).json({ error: 'Email ou Senha Inválidos' });
      return;
    }

    // Verify password
    const isValidPassword = await passwordService.verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      auditOperations.login(req, false, email, 'Invalid password');
      res.status(401).json({ error: 'Email ou Senha Inválidos' });
      return;
    }

    // Generate tokens
    const accessToken = jwtService.generateAccessToken(user);
    const refreshToken = jwtService.generateRefreshToken(user);

    // Create secure session with timestamp matching JWT iat (in seconds)
    const iat = Math.floor(Date.now() / 1000);
    const sessionId = `${user.id}-${iat}`;
    await createSecureSession(user.id, req, sessionId);

    // Store refresh token
    const refreshTokenId = uuidv4();
    await redisSessionManager.storeRefreshToken(refreshTokenId, user.id, refreshToken);

    // Audit log successful login
    auditOperations.login(req, true, email);

    logger.info(`User logged in successfully: ${email}`);

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        accountBalance: user.accountBalance,
        subscriptionStatus: user.subscriptionStatus,
        subscriptionExpiry: user.subscriptionExpiry
      },
      accessToken,
      refreshToken: refreshTokenId
    });
  } catch (error) {
    // Audit log failed login
    auditOperations.login(req, false, req.body.email, 'Login failed');
    
    logger.error('Login error:', error);
    res.status(500).json({ error: 'Falha no login' });
  }
});

// Refresh token endpoint
authRouter.post('/refresh', validateRequest(refreshTokenSchema), async (req: Request, res: Response) => {
  try {
    const { refreshToken: refreshTokenId }: RefreshTokenInput = req.body;

    // Get refresh token from Redis
    const tokenData = await redisSessionManager.getRefreshToken(refreshTokenId);
    if (!tokenData) {
      res.status(401).json({ error: 'Token de atualização inválido' });
      return;
    }

    // Verify the actual JWT token
    const payload = jwtService.verifyToken(tokenData.token);
    
    // Get user
    const user = await userRepository.findById(payload.userId);
    if (!user) {
      res.status(401).json({ error: 'Usuário não encontrado' });
      return;
    }

    // Generate new tokens
    const newAccessToken = jwtService.generateAccessToken(user);
    const newRefreshToken = jwtService.generateRefreshToken(user);

    // Store new session
    const sessionId = `${user.id}-${Date.now()}`;
    await redisSessionManager.storeSession(sessionId, user.id);

    // Store new refresh token and delete old one
    const newRefreshTokenId = uuidv4();
    await redisSessionManager.storeRefreshToken(newRefreshTokenId, user.id, newRefreshToken);
    await redisSessionManager.deleteRefreshToken(refreshTokenId);

    res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshTokenId
    });
  } catch (error) {
    logger.error('Token refresh error:', error);
    res.status(401).json({ error: 'Falha ao atualizar token' });
  }
});

// Forgot password endpoint
authRouter.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({ error: 'Email é obrigatório' });
      return;
    }

    // Check if user exists
    const user = await userRepository.findByEmail(email);
    
    if (user) {
      // Generate secure reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      
      // Store token in Redis with 1 hour expiration
      await redisSessionManager.storePasswordResetToken(email, resetToken, 3600); // 1 hour
      
      // Send password reset email
      await emailService.sendPasswordResetEmail(email, resetToken);
      
      logger.info(`Password reset requested for: ${email}`);
      
      res.json({ 
        success: true,
        userExists: true,
        message: 'Password reset email sent successfully' 
      });
    } else {
      // User doesn't exist
      logger.info(`Password reset requested for non-existent email: ${email}`);
      
      res.json({ 
        success: true,
        userExists: false,
        message: 'Email not found in our system' 
      });
    }
  } catch (error) {
    logger.error('Forgot password error:', error);
    res.status(500).json({ error: 'Falha ao processar solicitação' });
  }
});

// Reset password endpoint
authRouter.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      res.status(400).json({ error: 'Token e nova senha são obrigatórios' });
      return;
    }

    // Validate password strength
    if (newPassword.length < 6) {
      res.status(400).json({ error: 'A senha deve ter pelo menos 6 caracteres' });
      return;
    }

    // Get email from token
    const email = await redisSessionManager.getPasswordResetEmail(token);
    
    if (!email) {
      res.status(400).json({ error: 'Token de redefinição inválido ou expirado' });
      return;
    }

    // Get user
    const user = await userRepository.findByEmail(email);
    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado' });
      return;
    }

    // Hash new password
    const hashedPassword = await passwordService.hashPassword(newPassword);
    
    // Update password
    await userRepository.update(user.id, { password: hashedPassword });
    
    // Delete reset token
    await redisSessionManager.deletePasswordResetToken(token);
    
    // Invalidate all existing sessions for security
    // (User will need to login again with new password)
    
    logger.info(`Password reset successful for: ${email}`);
    
    res.json({ message: 'Senha redefinida com sucesso. Por favor, faça login com sua nova senha.' });
  } catch (error) {
    logger.error('Reset password error:', error);
    res.status(500).json({ error: 'Falha ao redefinir senha' });
  }
});

// Logout endpoint
authRouter.post('/logout', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (req.sessionId) {
      await redisSessionManager.deleteSession(req.sessionId);
    }

    // Also delete refresh token if provided
    const refreshTokenId = req.body.refreshToken;
    if (refreshTokenId) {
      await redisSessionManager.deleteRefreshToken(refreshTokenId);
    }

    // Audit log logout
    auditOperations.logout(req);

    logger.info(`User logged out: ${((req as any).user as AppUser)?.email || 'unknown'}`);
    res.json({ message: 'Logout realizado com sucesso' });
  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({ error: 'Falha no logout' });
  }
});

// Get current user profile
authRouter.get('/me', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as AppUser;
    
    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        accountBalance: user.accountBalance,
        subscriptionStatus: user.subscriptionStatus,
        subscriptionExpiry: user.subscriptionExpiry,
        lastDailyUse: user.lastDailyUse,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    logger.error('Get profile error:', error);
    res.status(500).json({ error: 'Falha ao obter perfil' });
  }
});

// Update user profile
authRouter.put('/me', authenticateToken, validateRequest(updateProfileSchema), async (req: Request, res: Response) => {
  try {
    const userId = ((req as any).user as AppUser).id;
    const updateData: UpdateProfileInput = req.body;

    // If email is being updated, check if it's already taken
    if (updateData.email) {
      const existingUser = await userRepository.findByEmail(updateData.email);
      if (existingUser && existingUser.id !== userId) {
        res.status(409).json({ error: 'Email já está em uso' });
        return;
      }
    }

    // Update user
    const updatedUser = await userRepository.update(userId, updateData);
    if (!updatedUser) {
      res.status(404).json({ error: 'Usuário não encontrado' });
      return;
    }

    logger.info(`User profile updated: ${updatedUser.email}`);

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        accountBalance: updatedUser.accountBalance,
        subscriptionStatus: updatedUser.subscriptionStatus,
        subscriptionExpiry: updatedUser.subscriptionExpiry
      }
    });
  } catch (error) {
    logger.error('Update profile error:', error);
    res.status(500).json({ error: 'Falha ao atualizar perfil' });
  }
});

// Change password
authRouter.put('/password', authenticateToken, validateRequest(changePasswordSchema), async (req: Request, res: Response) => {
  try {
    const userId = ((req as any).user as AppUser).id;
    const { currentPassword, newPassword }: ChangePasswordInput = req.body;

    // Get user with password hash
    const user = await userRepository.findById(userId);
    if (!user || !user.passwordHash) {
      res.status(400).json({ error: 'Não é possível alterar a senha desta conta' });
      return;
    }

    // Verify current password
    const isValidPassword = await passwordService.verifyPassword(currentPassword, user.passwordHash);
    if (!isValidPassword) {
      res.status(401).json({ error: 'Senha atual incorreta' });
      return;
    }

    // Validate new password strength
    const passwordValidation = passwordService.validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      res.status(400).json({
        error: 'Password validation failed',
        details: passwordValidation.errors
      });
      return;
    }

    // Hash new password
    const newPasswordHash = await passwordService.hashPassword(newPassword);

    // Update password
    await userRepository.update(userId, { passwordHash: newPasswordHash });

    logger.info(`Password changed for user: ${user.email}`);

    res.json({ message: 'Senha alterada com sucesso' });
  } catch (error) {
    logger.error('Change password error:', error);
    res.status(500).json({ error: 'Falha ao alterar senha' });
  }
});

// Google OAuth routes
authRouter.get('/google', (req, res, next) => {
  console.log('[GOOGLE AUTH] Starting Google OAuth flow');
  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});

authRouter.get('/google/callback', 
  passport.authenticate('google', { session: false }),
  async (req: Request, res: Response) => {
    try {
      const user = (req as any).user as AppUser;
      
      if (!user) {
        res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=oauth_failed`);
        return;
      }

      // Generate tokens
      const accessToken = jwtService.generateAccessToken(user);
      const refreshToken = jwtService.generateRefreshToken(user);

      // Decode token to get iat (issued at time)
      const payload = jwtService.verifyToken(accessToken);
      
      // Store session with same format as middleware expects
      const sessionId = `${user.id}-${payload.iat}`;
      await redisSessionManager.storeSession(sessionId, user.id);

      // Store refresh token
      const refreshTokenId = uuidv4();
      await redisSessionManager.storeRefreshToken(refreshTokenId, user.id, refreshToken);

      // Redirect to frontend with tokens
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      res.redirect(`${frontendUrl}/auth/callback?token=${accessToken}&refresh=${refreshTokenId}`);
    } catch (error) {
      logger.error('Google OAuth callback error:', error);
      res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=oauth_failed`);
    }
  }
);

export default authRouter;
