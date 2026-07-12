import request from 'supertest';
import { describe, it, expect, vi } from 'vitest';
import mongoose from 'mongoose';
import { app } from '../app.js';
import { User } from '../models/user.model.js';
import { Problem } from '../models/problem.model.js';
import { Analysis } from '../models/analysis.model.js';
import { generateProblemAnalysis } from '../services/geminiAnalysis.service.js';

describe('Analysis API Integration Tests', () => {
  const mockUser1 = {
    fullName: 'Alice Analysis',
    username: 'analysis_alice',
    email: 'analysis_alice@example.com',
    password: 'Password123!',
  };

  const mockUser2 = {
    fullName: 'Bob Analysis',
    username: 'analysis_bob',
    email: 'analysis_bob@example.com',
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
      title: 'Two Sum',
      problemStatement: 'Given an array of integers, return indices of the two numbers such that they add up to a specific target.',
      constraints: ['2 <= nums.length <= 10^4'],
      examples: [{ input: '[2,7,11,15], target = 9', output: '[0,1]', explanation: 'Because nums[0] + nums[1] == 9' }],
      language: 'cpp',
      requestedSections: ['problemExplanation', 'exampleExplanation', 'hints'],
      status: 'draft',
      ...overrides,
    });
  };

  describe('POST /api/v1/problems/:problemId/analyses', () => {
    it('should successfully create analysis, run mock process, set problem to completed, and increment practiceCount', async () => {
      const aliceToken = await getAuthToken(mockUser1);
      const alice = await User.findOne({ email: mockUser1.email });
      const prob = await createMockProblem(alice._id);

      const res = await request(app)
        .post(`/api/v1/problems/${prob._id}/analyses`)
        .set('Cookie', [`accessToken=${aliceToken}`])
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.analysis.status).toBe('completed');
      expect(res.body.data.analysis.result).toBeDefined();

      // Check problem is updated to completed
      const updatedProb = await Problem.findById(prob._id);
      expect(updatedProb.status).toBe('completed');
      expect(updatedProb.practiceCount).toBe(1);
    });

    it('should block concurrent queued or processing runs with 409 conflict error', async () => {
      const aliceToken = await getAuthToken(mockUser1);
      const alice = await User.findOne({ email: mockUser1.email });
      const prob = await createMockProblem(alice._id);

      // Create an active analysis mock
      await Analysis.create({
        problem: prob._id,
        owner: alice._id,
        status: 'queued',
        requestedSections: ['problemExplanation'],
        inputSnapshot: {
          title: 'Test',
          problemStatement: 'Some statement description',
          language: 'cpp',
        },
      });

      const res = await request(app)
        .post(`/api/v1/problems/${prob._id}/analyses`)
        .set('Cookie', [`accessToken=${aliceToken}`])
        .send({});

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it('should prevent analyzing another user\'s problem with 404 error', async () => {
      const alice = await User.create(mockUser1);
      const bobToken = await getAuthToken(mockUser2);
      const prob = await createMockProblem(alice._id);

      const res = await request(app)
        .post(`/api/v1/problems/${prob._id}/analyses`)
        .set('Cookie', [`accessToken=${bobToken}`])
        .send({});

      expect(res.status).toBe(404);
    });

    it('should transition both problem and analysis status to failed when Gemini generator rejects', async () => {
      // Stub the globally mocked generator call to reject
      vi.mocked(generateProblemAnalysis).mockRejectedValueOnce(new Error('Gemini pipeline failed'));

      const aliceToken = await getAuthToken(mockUser1);
      const alice = await User.findOne({ email: mockUser1.email });
      const prob = await createMockProblem(alice._id);

      const res = await request(app)
        .post(`/api/v1/problems/${prob._id}/analyses`)
        .set('Cookie', [`accessToken=${aliceToken}`])
        .send({});

      // Note: startProblemAnalysis returns 200 containing the processed analysis document, 
      // even if processAnalysis catches the failure and sets status failed.
      expect(res.status).toBe(200);
      expect(res.body.data.analysis.status).toBe('failed');

      // Verify DB updates
      const updatedProb = await Problem.findById(prob._id);
      expect(updatedProb.status).toBe('failed');
      expect(updatedProb.practiceCount).toBe(0); // remains 0 since it failed

      const dbAnalysis = await Analysis.findById(res.body.data.analysis._id);
      expect(dbAnalysis.status).toBe('failed');
      expect(dbAnalysis.errorMessage).toContain('Gemini pipeline failed');
      // Verify raw stack trace is hidden
      expect(dbAnalysis.errorMessage).not.toContain('stack');
    });
  });

  describe('Retrieval Endpoints', () => {
    it('should fetch analysis by ID and isolate access from other users', async () => {
      const alice = await User.create(mockUser1);
      const bob = await User.create(mockUser2);
      const prob = await createMockProblem(alice._id);

      const analysis = await Analysis.create({
        problem: prob._id,
        owner: alice._id,
        status: 'completed',
        requestedSections: ['problemExplanation'],
        inputSnapshot: {
          title: 'Test',
          problemStatement: 'Some statement description',
          language: 'cpp',
        },
      });

      const aliceToken = alice.generateAccessToken();
      const bobToken = bob.generateAccessToken();

      // Alice can fetch
      const res1 = await request(app)
        .get(`/api/v1/analyses/${analysis._id}`)
        .set('Cookie', [`accessToken=${aliceToken}`]);
      expect(res1.status).toBe(200);
      expect(res1.body.data.analysis._id).toBe(analysis._id.toString());

      // Bob receives 404
      const res2 = await request(app)
        .get(`/api/v1/analyses/${analysis._id}`)
        .set('Cookie', [`accessToken=${bobToken}`]);
      expect(res2.status).toBe(404);
    });

    it('should retrieve latest completed analysis and list historical timeline', async () => {
      const aliceToken = await getAuthToken(mockUser1);
      const alice = await User.findOne({ email: mockUser1.email });
      const prob = await createMockProblem(alice._id);

      // Create two analyses
      const a1 = await Analysis.create({
        problem: prob._id,
        owner: alice._id,
        status: 'completed',
        requestedSections: ['problemExplanation'],
        inputSnapshot: {
          title: 'First Run',
          problemStatement: 'Some statement description',
          language: 'cpp',
        },
        createdAt: new Date(Date.now() - 5000),
      });

      const a2 = await Analysis.create({
        problem: prob._id,
        owner: alice._id,
        status: 'completed',
        requestedSections: ['problemExplanation'],
        inputSnapshot: {
          title: 'Second Run',
          problemStatement: 'Some statement description',
          language: 'cpp',
        },
        createdAt: new Date(),
      });

      // Latest check
      const resLatest = await request(app)
        .get(`/api/v1/problems/${prob._id}/analyses/latest`)
        .set('Cookie', [`accessToken=${aliceToken}`]);
      expect(resLatest.status).toBe(200);
      expect(resLatest.body.data.analysis._id).toBe(a2._id.toString());

      // History check
      const resHistory = await request(app)
        .get(`/api/v1/problems/${prob._id}/analyses`)
        .set('Cookie', [`accessToken=${aliceToken}`]);
      expect(resHistory.status).toBe(200);
      expect(resHistory.body.data.analyses.length).toBe(2);
    });

    it('should support comparing two completed analyses', async () => {
      const aliceToken = await getAuthToken(mockUser1);
      const alice = await User.findOne({ email: mockUser1.email });
      const prob = await createMockProblem(alice._id);

      const a1 = await Analysis.create({
        problem: prob._id,
        owner: alice._id,
        status: 'completed',
        requestedSections: ['problemExplanation'],
        inputSnapshot: {
          title: 'First Run',
          problemStatement: 'Some statement description',
          language: 'cpp',
          code: 'class Solution {};',
        },
      });

      const a2 = await Analysis.create({
        problem: prob._id,
        owner: alice._id,
        status: 'completed',
        requestedSections: ['problemExplanation'],
        inputSnapshot: {
          title: 'Second Run',
          problemStatement: 'Some statement description',
          language: 'cpp',
          code: 'class Solution { void twoSum(); };',
        },
      });

      const res = await request(app)
        .get(`/api/v1/problems/${prob._id}/analyses/compare?firstAnalysisId=${a1._id}&secondAnalysisId=${a2._id}`)
        .set('Cookie', [`accessToken=${aliceToken}`]);

      expect(res.status).toBe(200);
      expect(res.body.data.comparisonSummary.codeChanged).toBe(true);
    });
  });
});
