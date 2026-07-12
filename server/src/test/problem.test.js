import request from 'supertest';
import { describe, it, expect } from 'vitest';
import mongoose from 'mongoose';
import { app } from '../app.js';
import { User } from '../models/user.model.js';
import { Problem } from '../models/problem.model.js';

describe('Problem API Integration Tests', () => {
  const mockUser1 = {
    fullName: 'Alice Problem',
    username: 'prob_alice',
    email: 'prob_alice@example.com',
    password: 'Password123!',
  };

  const mockUser2 = {
    fullName: 'Bob Problem',
    username: 'prob_bob',
    email: 'prob_bob@example.com',
    password: 'Password123!',
  };

  const getAuthToken = async (userData) => {
    let user = await User.findOne({ email: userData.email });
    if (!user) {
      user = await User.create(userData);
    }
    return user.generateAccessToken();
  };

  const createMockProblem = async (ownerId, overrides = {}) => {
    return await Problem.create({
      owner: ownerId,
      title: 'Two Sum Problem',
      problemStatement: 'Given an array of integers, return indices of the two numbers such that they add up to a specific target.',
      constraints: ['2 <= nums.length <= 10^4'],
      examples: [{ input: '[2,7,11,15], target = 9', output: '[0,1]', explanation: 'Because nums[0] + nums[1] == 9' }],
      language: 'cpp',
      requestedSections: ['problemExplanation', 'exampleExplanation', 'hints'],
      status: 'draft',
      ...overrides,
    });
  };

  describe('POST /api/v1/problems', () => {
    it('should successfully create a problem for authenticated user and associate ownership', async () => {
      const token = await getAuthToken(mockUser1);
      const res = await request(app)
        .post('/api/v1/problems')
        .set('Cookie', [`accessToken=${token}`])
        .send({
          title: 'Reverse String',
          problemStatement: 'Write a function that reverses a string.',
          constraints: ['1 <= s.length <= 10^5'],
          examples: [{ input: '["h","e","l","l","o"]', output: '["o","l","l","e","h"]' }],
          language: 'python',
          requestedSections: ['problemExplanation'],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.problem.title).toBe('Reverse String');
      expect(res.body.data.problem.owner).toBeDefined();
    });

    it('should return 401 Unauthorized for unauthenticated requests', async () => {
      const res = await request(app)
        .post('/api/v1/problems')
        .send({
          title: 'Reverse String',
          problemStatement: 'Write a function that reverses a string.',
        });

      expect(res.status).toBe(401);
    });

    it('should reject client-supplied owner field due to schema strictness', async () => {
      const token = await getAuthToken(mockUser1);
      const fakeId = new mongoose.Types.ObjectId().toString();

      const res = await request(app)
        .post('/api/v1/problems')
        .set('Cookie', [`accessToken=${token}`])
        .send({
          title: 'Reverse String',
          problemStatement: 'Write a function that reverses a string.',
          owner: fakeId,
        });

      expect(res.status).toBe(400); // strict validation error
      expect(res.body.success).toBe(false);
    });

    it('should reject invalid requested sections', async () => {
      const token = await getAuthToken(mockUser1);
      const res = await request(app)
        .post('/api/v1/problems')
        .set('Cookie', [`accessToken=${token}`])
        .send({
          title: 'Reverse String',
          problemStatement: 'Write a function that reverses a string.',
          requestedSections: ['invalidSectionName'],
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject userCodeReview selection if code is empty or missing', async () => {
      const token = await getAuthToken(mockUser1);
      const res = await request(app)
        .post('/api/v1/problems')
        .set('Cookie', [`accessToken=${token}`])
        .send({
          title: 'Reverse String',
          problemStatement: 'Write a function that reverses a string.',
          requestedSections: ['userCodeReview'],
          code: '   ',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors).toBeDefined();
    });
  });

  describe('GET /api/v1/problems', () => {
    it('should return only problems owned by the authenticated user', async () => {
      const alice = await User.create(mockUser1);
      const bob = await User.create(mockUser2);

      await createMockProblem(alice._id, { title: 'Alice Task' });
      await createMockProblem(bob._id, { title: 'Bob Task' });

      const aliceToken = alice.generateAccessToken();
      const res = await request(app)
        .get('/api/v1/problems')
        .set('Cookie', [`accessToken=${aliceToken}`]);

      expect(res.status).toBe(200);
      expect(res.body.data.problems.length).toBe(1);
      expect(res.body.data.problems[0].title).toBe('Alice Task');
    });

    it('should support pagination default parameter logic', async () => {
      const alice = await User.create(mockUser1);
      const aliceToken = alice.generateAccessToken();

      await createMockProblem(alice._id, { title: 'Problem One' });
      await createMockProblem(alice._id, { title: 'Problem Two' });

      const res = await request(app)
        .get('/api/v1/problems?page=1&limit=1')
        .set('Cookie', [`accessToken=${aliceToken}`]);

      expect(res.status).toBe(200);
      expect(res.body.data.problems.length).toBe(1);
      expect(res.body.data.pagination.totalPages).toBe(2);
    });

    it('should support filtering by status, topic, confidence, and revision due state', async () => {
      const alice = await User.create(mockUser1);
      const aliceToken = alice.generateAccessToken();

      await createMockProblem(alice._id, {
        title: 'Overdue Review',
        confidence: 'weak',
        topics: ['arrays'],
        nextRevisionAt: new Date(Date.now() - 3600000), // 1 hour ago
      });

      await createMockProblem(alice._id, {
        title: 'Future Review',
        confidence: 'confident',
        topics: ['strings'],
        nextRevisionAt: new Date(Date.now() + 3600000), // 1 hour future
      });

      // Filter by revisionDue
      const res1 = await request(app)
        .get('/api/v1/problems?revisionDue=true')
        .set('Cookie', [`accessToken=${aliceToken}`]);

      expect(res1.status).toBe(200);
      expect(res1.body.data.problems.length).toBe(1);
      expect(res1.body.data.problems[0].title).toBe('Overdue Review');

      // Filter by topic
      const res2 = await request(app)
        .get('/api/v1/problems?topic=strings')
        .set('Cookie', [`accessToken=${aliceToken}`]);

      expect(res2.status).toBe(200);
      expect(res2.body.data.problems.length).toBe(1);
      expect(res2.body.data.problems[0].title).toBe('Future Review');

      // Filter by confidence
      const res3 = await request(app)
        .get('/api/v1/problems?confidence=weak')
        .set('Cookie', [`accessToken=${aliceToken}`]);

      expect(res3.status).toBe(200);
      expect(res3.body.data.problems.length).toBe(1);
      expect(res3.body.data.problems[0].title).toBe('Overdue Review');
    });
  });

  describe('GET /api/v1/problems/:problemId', () => {
    it('should allow accessing owned problems', async () => {
      const alice = await User.create(mockUser1);
      const prob = await createMockProblem(alice._id);
      const aliceToken = alice.generateAccessToken();

      const res = await request(app)
        .get(`/api/v1/problems/${prob._id}`)
        .set('Cookie', [`accessToken=${aliceToken}`]);

      expect(res.status).toBe(200);
      expect(res.body.data.problem.title).toBe(prob.title);
    });

    it('should return 404 for problems owned by other users', async () => {
      const alice = await User.create(mockUser1);
      const bob = await User.create(mockUser2);
      const prob = await createMockProblem(alice._id);
      const bobToken = bob.generateAccessToken();

      const res = await request(app)
        .get(`/api/v1/problems/${prob._id}`)
        .set('Cookie', [`accessToken=${bobToken}`]);

      expect(res.status).toBe(404);
    });

    it('should return 400 Bad Request for malformed ObjectIds', async () => {
      const alice = await User.create(mockUser1);
      const aliceToken = alice.generateAccessToken();

      const res = await request(app)
        .get('/api/v1/problems/not-a-valid-id')
        .set('Cookie', [`accessToken=${aliceToken}`]);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('PATCH /api/v1/problems/:problemId', () => {
    it('should allow owner to update and reset status to draft', async () => {
      const alice = await User.create(mockUser1);
      const prob = await createMockProblem(alice._id, { status: 'completed' });
      const aliceToken = alice.generateAccessToken();

      const res = await request(app)
        .patch(`/api/v1/problems/${prob._id}`)
        .set('Cookie', [`accessToken=${aliceToken}`])
        .send({ title: 'New Title' });

      expect(res.status).toBe(200);
      expect(res.body.data.problem.title).toBe('New Title');
      expect(res.body.data.problem.status).toBe('draft');
    });

    it('should reject updates to forbidden protected schema attributes', async () => {
      const alice = await User.create(mockUser1);
      const prob = await createMockProblem(alice._id);
      const aliceToken = alice.generateAccessToken();

      const res = await request(app)
        .patch(`/api/v1/problems/${prob._id}`)
        .set('Cookie', [`accessToken=${aliceToken}`])
        .send({ owner: new mongoose.Types.ObjectId().toString() });

      expect(res.status).toBe(400);
    });
  });

  describe('PATCH /api/v1/problems/:problemId/learning', () => {
    it('should allow updating metadata parameters without resetting problem status to draft', async () => {
      const alice = await User.create(mockUser1);
      const prob = await createMockProblem(alice._id, { status: 'completed' });
      const aliceToken = alice.generateAccessToken();

      const res = await request(app)
        .patch(`/api/v1/problems/${prob._id}/learning`)
        .set('Cookie', [`accessToken=${aliceToken}`])
        .send({
          topics: ['arrays', 'strings'],
          confidence: 'confident',
          isBookmarked: true,
          studentNotes: 'These are revision notes.',
          nextRevisionAt: new Date(Date.now() + 100000).toISOString(),
        });

      expect(res.status).toBe(200);
      expect(res.body.data.problem.status).toBe('completed'); // remains completed
      expect(res.body.data.problem.confidence).toBe('confident');
      expect(res.body.data.problem.isBookmarked).toBe(true);
    });
  });

  describe('DELETE /api/v1/problems/:problemId', () => {
    it('should allow owner to delete the problem specifications', async () => {
      const alice = await User.create(mockUser1);
      const prob = await createMockProblem(alice._id);
      const aliceToken = alice.generateAccessToken();

      const res = await request(app)
        .delete(`/api/v1/problems/${prob._id}`)
        .set('Cookie', [`accessToken=${aliceToken}`]);

      expect(res.status).toBe(200);

      const dbCheck = await Problem.findById(prob._id);
      expect(dbCheck).toBeNull();
    });

    it('should return 404 if another user tries to delete the problem', async () => {
      const alice = await User.create(mockUser1);
      const bob = await User.create(mockUser2);
      const prob = await createMockProblem(alice._id);
      const bobToken = bob.generateAccessToken();

      const res = await request(app)
        .delete(`/api/v1/problems/${prob._id}`)
        .set('Cookie', [`accessToken=${bobToken}`]);

      expect(res.status).toBe(404);
    });
  });
});
