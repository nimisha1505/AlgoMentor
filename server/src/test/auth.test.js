import request from 'supertest';
import { describe, it, expect } from 'vitest';
import { app } from '../app.js';
import { User } from '../models/user.model.js';

describe('Authentication Integration Tests', () => {
  const mockUser = {
    fullName: 'Jane Doe',
    username: 'janedoe',
    email: 'jane@example.com',
    password: 'Password123!',
  };

  describe('POST /api/v1/auth/register', () => {
    it('should successfully register a new user and hide credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(mockUser);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.username).toBe(mockUser.username);
      expect(res.body.data.email).toBe(mockUser.email);
      expect(res.body.data.password).toBeUndefined();
      expect(res.body.data.refreshToken).toBeUndefined();
    });

    it('should reject registration if the email already exists', async () => {
      await User.create(mockUser);

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          fullName: 'Other Name',
          username: 'othername',
          email: mockUser.email,
          password: 'Password123!',
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Email');
    });

    it('should reject registration if the username already exists', async () => {
      await User.create(mockUser);

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          fullName: 'Other Name',
          username: mockUser.username,
          email: 'other@example.com',
          password: 'Password123!',
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Username');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should log in a valid user and return credentials cookies', async () => {
      await User.create(mockUser);

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: mockUser.email,
          password: mockUser.password,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(mockUser.email);

      // Verify authentication cookies are set
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies.some((c) => c.startsWith('accessToken='))).toBe(true);
      expect(cookies.some((c) => c.startsWith('refreshToken='))).toBe(true);
    });

    it('should reject login for unknown emails with generic auth error', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'notfound@example.com',
          password: 'Password123!',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid email or password');
    });

    it('should reject login for incorrect passwords with generic auth error', async () => {
      await User.create(mockUser);

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: mockUser.email,
          password: 'WrongPassword!',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid email or password');
    });
  });

  describe('GET /api/v1/auth/current-user', () => {
    it('should successfully return the profile of an authenticated request', async () => {
      const user = await User.create(mockUser);
      const accessToken = user.generateAccessToken();

      const res = await request(app)
        .get('/api/v1/auth/current-user')
        .set('Cookie', [`accessToken=${accessToken}`]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(mockUser.email);
    });

    it('should return 401 Unauthorized for unauthenticated requests', async () => {
      const res = await request(app).get('/api/v1/auth/current-user');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should successfully log out and clear all credentials cookies', async () => {
      const user = await User.create(mockUser);
      const accessToken = user.generateAccessToken();

      const res = await request(app)
        .post('/api/v1/auth/logout')
        .set('Cookie', [`accessToken=${accessToken}`]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies.some((c) => c.includes('accessToken=;'))).toBe(true);
      expect(cookies.some((c) => c.includes('refreshToken=;'))).toBe(true);
    });
  });
});
