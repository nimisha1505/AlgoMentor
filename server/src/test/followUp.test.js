import request from 'supertest';
import { describe, it, expect } from 'vitest';
import { app } from '../app.js';
import { User } from '../models/user.model.js';
import { Problem } from '../models/problem.model.js';
import { Analysis } from '../models/analysis.model.js';
import { AnalysisFollowUp } from '../models/analysisFollowUp.model.js';

describe('Follow-up API Integration Tests', () => {
  const mockUser1 = {
    fullName: 'Alice FollowUp',
    username: 'follow_alice',
    email: 'follow_alice@example.com',
    password: 'Password123!',
  };

  const mockUser2 = {
    fullName: 'Bob FollowUp',
    username: 'follow_bob',
    email: 'follow_bob@example.com',
    password: 'Password123!',
  };

  const getAuthToken = async (userData) => {
    let user = await User.findOne({ email: userData.email });
    if (!user) {
      user = await User.create(userData);
    }
    return user.generateAccessToken();
  };

  const createMockProblem = async (ownerId) => {
    return await Problem.create({
      owner: ownerId,
      title: 'Two Sum',
      problemStatement: 'Given an array of integers, return indices of the two numbers such that they add up to a specific target.',
      constraints: ['2 <= nums.length <= 10^4'],
      examples: [{ input: '[2,7,11,15], target = 9', output: '[0,1]', explanation: 'Because nums[0] + nums[1] == 9' }],
      language: 'cpp',
      requestedSections: ['problemExplanation', 'exampleExplanation', 'hints'],
      status: 'completed',
    });
  };

  const createMockAnalysis = async (problemId, ownerId, status = 'completed') => {
    return await Analysis.create({
      problem: problemId,
      owner: ownerId,
      status,
      requestedSections: ['problemExplanation'],
      inputSnapshot: {
        title: 'Test Snapshot',
        problemStatement: 'Given an array of integers, return indices of the two numbers such that they add up to a specific target.',
        language: 'cpp',
      },
    });
  };

  describe('POST /api/v1/analyses/:analysisId/follow-ups', () => {
    it('should successfully submit follow-up to a completed analysis and return AI response', async () => {
      const aliceToken = await getAuthToken(mockUser1);
      const alice = await User.findOne({ email: mockUser1.email });
      const prob = await createMockProblem(alice._id);
      const analysis = await createMockAnalysis(prob._id, alice._id, 'completed');

      const res = await request(app)
        .post(`/api/v1/analyses/${analysis._id}/follow-ups`)
        .set('Cookie', [`accessToken=${aliceToken}`])
        .send({
          question: 'What is the space complexity?',
          mode: 'explain',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.followUp.answer).toBeDefined();

      const dbCheck = await AnalysisFollowUp.findOne({ analysis: analysis._id });
      expect(dbCheck).toBeDefined();
      expect(dbCheck.question).toBe('What is the space complexity?');
    });

    it('should reject follow-ups on non-completed analysis documents with 404 error', async () => {
      const aliceToken = await getAuthToken(mockUser1);
      const alice = await User.findOne({ email: mockUser1.email });
      const prob = await createMockProblem(alice._id);
      const analysis = await createMockAnalysis(prob._id, alice._id, 'queued');

      const res = await request(app)
        .post(`/api/v1/analyses/${analysis._id}/follow-ups`)
        .set('Cookie', [`accessToken=${aliceToken}`])
        .send({
          question: 'What is the space complexity?',
          mode: 'explain',
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should block users who are not owners of the analysis', async () => {
      const alice = await User.create(mockUser1);
      const bobToken = await getAuthToken(mockUser2);
      const prob = await createMockProblem(alice._id);
      const analysis = await createMockAnalysis(prob._id, alice._id, 'completed');

      const res = await request(app)
        .post(`/api/v1/analyses/${analysis._id}/follow-ups`)
        .set('Cookie', [`accessToken=${bobToken}`])
        .send({
          question: 'What is the space complexity?',
          mode: 'explain',
        });

      expect(res.status).toBe(404); // returns 404 Completed analysis not found
    });

    it('should trigger Zod validation error for short questions', async () => {
      const aliceToken = await getAuthToken(mockUser1);
      const alice = await User.findOne({ email: mockUser1.email });
      const prob = await createMockProblem(alice._id);
      const analysis = await createMockAnalysis(prob._id, alice._id, 'completed');

      const res = await request(app)
        .post(`/api/v1/analyses/${analysis._id}/follow-ups`)
        .set('Cookie', [`accessToken=${aliceToken}`])
        .send({
          question: 'hi',
          mode: 'explain',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBeDefined();
    });

    it('should trigger Zod validation error for invalid mode types', async () => {
      const aliceToken = await getAuthToken(mockUser1);
      const alice = await User.findOne({ email: mockUser1.email });
      const prob = await createMockProblem(alice._id);
      const analysis = await createMockAnalysis(prob._id, alice._id, 'completed');

      const res = await request(app)
        .post(`/api/v1/analyses/${analysis._id}/follow-ups`)
        .set('Cookie', [`accessToken=${aliceToken}`])
        .send({
          question: 'What is the space complexity?',
          mode: 'invalidModeName',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/analyses/:analysisId/follow-ups', () => {
    it('should return complete follow-up thread list for owners', async () => {
      const aliceToken = await getAuthToken(mockUser1);
      const alice = await User.findOne({ email: mockUser1.email });
      const prob = await createMockProblem(alice._id);
      const analysis = await createMockAnalysis(prob._id, alice._id, 'completed');

      await AnalysisFollowUp.create({
        analysis: analysis._id,
        problem: prob._id,
        owner: alice._id,
        question: 'Q1',
        answer: 'A1',
      });

      const res = await request(app)
        .get(`/api/v1/analyses/${analysis._id}/follow-ups`)
        .set('Cookie', [`accessToken=${aliceToken}`]);

      expect(res.status).toBe(200);
      expect(res.body.data.followUps.length).toBe(1);
      expect(res.body.data.followUps[0].question).toBe('Q1');
    });
  });
});
