import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import authRouter from './routes.js';

describe('Auth Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/auth', authRouter);
  });

  afterEach(() => {
    // Clean up any test data if needed
  });

  it('should validate registration input', async () => {
    const response = await request(app)
      .post('/auth/register')
      .send({
        email: 'invalid-email',
        password: '123', // too short
        name: ''
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Validation failed');
    expect(response.body.details).toBeDefined();
    expect(response.body.details.length).toBeGreaterThan(0);
  });

  it('should validate login input', async () => {
    const response = await request(app)
      .post('/auth/login')
      .send({
        email: 'invalid-email',
        password: ''
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Validation failed');
    expect(response.body.details).toBeDefined();
  });

  it.skip('should reject login with non-existent user (requires database)', async () => {
    // This test requires a database connection
    // In a real test environment, you would mock the database or use a test database
    const response = await request(app)
      .post('/auth/login')
      .send({
        email: 'nonexistent@example.com',
        password: 'password123'
      });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Invalid credentials');
  });

  it('should require authentication for protected routes', async () => {
    const response = await request(app)
      .get('/auth/me');

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Access token required');
  });

  it('should reject invalid tokens', async () => {
    const response = await request(app)
      .get('/auth/me')
      .set('Authorization', 'Bearer invalid-token');

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Invalid token');
  });

  it('should validate refresh token input', async () => {
    const response = await request(app)
      .post('/auth/refresh')
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Validation failed');
  });
});