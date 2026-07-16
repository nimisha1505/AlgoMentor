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

  const waitForAnalysis = async (analysisId, maxRetries = 20) => {
    for (let i = 0; i < maxRetries; i++) {
      const a = await Analysis.findById(analysisId);
      if (a && (a.status === 'completed' || a.status === 'failed')) return a;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    throw new Error('Timeout waiting for background analysis');
  };

  describe('POST /api/v1/problems/:problemId/analyses', () => {
    it('should successfully queue analysis, run mock process in background, set problem to completed, and increment practiceCount', async () => {
      const aliceToken = await getAuthToken(mockUser1);
      const alice = await User.findOne({ email: mockUser1.email });
      const prob = await createMockProblem(alice._id);

      const res = await request(app)
        .post(`/api/v1/problems/${prob._id}/analyses`)
        .set('Cookie', [`accessToken=${aliceToken}`])
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.analysis.status).toBe('queued');

      // Wait for the background process to finish
      const analysisId = res.body.data.analysis._id;
      const completedAnalysis = await waitForAnalysis(analysisId);

      expect(completedAnalysis.status).toBe('completed');
      expect(completedAnalysis.result).toBeDefined();

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

      // Note: startProblemAnalysis returns 200 with status queued immediately
      expect(res.status).toBe(200);
      expect(res.body.data.analysis.status).toBe('queued');

      // Wait for the background process to finish and fail
      const analysisId = res.body.data.analysis._id;
      const dbAnalysis = await waitForAnalysis(analysisId);

      // Verify DB updates
      const updatedProb = await Problem.findById(prob._id);
      expect(updatedProb.status).toBe('failed');
      expect(updatedProb.practiceCount).toBe(0); // remains 0 since it failed

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

  describe('End-to-End requestedSections and analysisDepth preserving tests', () => {
    it('Test A: should save only problemExplanation and pattern, omitting other returned sections', async () => {
      const aliceToken = await getAuthToken(mockUser1);
      const alice = await User.findOne({ email: mockUser1.email });
      const prob = await createMockProblem(alice._id, {
        requestedSections: ['problemExplanation', 'pattern'],
      });

      vi.mocked(generateProblemAnalysis).mockImplementationOnce(async ({ requestedSections }) => {
        const rawResult = JSON.stringify({
          problemExplanation: 'Mocked explanation content',
          pattern: { name: 'sliding-window', clues: ['clue 1'], reason: 'reason 1' },
          hints: [{ level: 1, hint: 'First hint' }],
          approaches: [{ name: 'Brute Force', category: 'bruteForce', intuition: 'None', steps: ['step'], timeComplexity: 'O(N)', spaceComplexity: 'O(1)' }],
          codes: [{ approach: 'Brute Force', language: 'cpp', code: 'class Solution {};' }],
          complexities: [{ approach: 'Brute Force', timeComplexity: 'O(N)', timeReason: 'nested loops', spaceComplexity: 'O(1)', spaceReason: 'no extra space' }],
        });
        const { parseAnalysisResult } = await import('../validators/analysisResult.validator.js');
        const result = parseAnalysisResult({ rawResult, requestedSections });
        return {
          result,
          modelName: 'gemini-mock',
          usage: { promptTokenCount: 100, candidatesTokenCount: 150, totalTokenCount: 250 },
        };
      });

      const res = await request(app)
        .post(`/api/v1/problems/${prob._id}/analyses`)
        .set('Cookie', [`accessToken=${aliceToken}`])
        .send({});

      expect(res.status).toBe(200);
      
      const analysisId = res.body.data.analysis._id;
      const completedAnalysis = await waitForAnalysis(analysisId);

      expect(completedAnalysis.result.problemExplanation).toBeDefined();
      expect(completedAnalysis.result.pattern).toBeDefined();
      expect(completedAnalysis.result.hints).toBeUndefined();
      expect(completedAnalysis.result.approaches).toBeUndefined();
      expect(completedAnalysis.result.codes).toBeUndefined();
      expect(completedAnalysis.result.complexities).toBeUndefined();
    });

    it('Test B: should retain only edgeCases when requestedSections is [edgeCases]', async () => {
      const aliceToken = await getAuthToken(mockUser1);
      const alice = await User.findOne({ email: mockUser1.email });
      const prob = await createMockProblem(alice._id, {
        requestedSections: ['edgeCases'],
      });

      vi.mocked(generateProblemAnalysis).mockImplementationOnce(async ({ requestedSections }) => {
        const rawResult = JSON.stringify({
          problemExplanation: 'Mocked explanation content',
          edgeCases: [{ case: 'Empty array', reason: 'Basic validation' }],
        });
        const { parseAnalysisResult } = await import('../validators/analysisResult.validator.js');
        const result = parseAnalysisResult({ rawResult, requestedSections });
        return {
          result,
          modelName: 'gemini-mock',
          usage: { promptTokenCount: 100, candidatesTokenCount: 150, totalTokenCount: 250 },
        };
      });

      const res = await request(app)
        .post(`/api/v1/problems/${prob._id}/analyses`)
        .set('Cookie', [`accessToken=${aliceToken}`])
        .send({});

      expect(res.status).toBe(200);
      const completedAnalysis = await waitForAnalysis(res.body.data.analysis._id);
      expect(completedAnalysis.result.edgeCases).toBeDefined();
      expect(completedAnalysis.result.problemExplanation).toBeUndefined();
    });

    it('Test C: should retain only userCodeReview and complexities, requiring non-empty code', async () => {
      const aliceToken = await getAuthToken(mockUser1);
      const alice = await User.findOne({ email: mockUser1.email });
      const prob = await createMockProblem(alice._id, {
        requestedSections: ['userCodeReview', 'complexities'],
        code: 'class Solution {};',
      });

      vi.mocked(generateProblemAnalysis).mockImplementationOnce(async ({ requestedSections }) => {
        const rawResult = JSON.stringify({
          problemExplanation: 'Mocked explanation content',
          userCodeReview: { isCorrect: true, summary: 'Good job', strengths: ['clean'], bugs: [], missedEdgeCases: [], timeComplexity: 'O(1)', spaceComplexity: 'O(1)', improvements: [], correctedCode: '' },
          complexities: [{ approach: 'Brute Force', timeComplexity: 'O(N)', timeReason: 'nested loops', spaceComplexity: 'O(1)', spaceReason: 'no extra space' }],
        });
        const { parseAnalysisResult } = await import('../validators/analysisResult.validator.js');
        const result = parseAnalysisResult({ rawResult, requestedSections });
        return {
          result,
          modelName: 'gemini-mock',
          usage: { promptTokenCount: 100, candidatesTokenCount: 150, totalTokenCount: 250 },
        };
      });

      const res = await request(app)
        .post(`/api/v1/problems/${prob._id}/analyses`)
        .set('Cookie', [`accessToken=${aliceToken}`])
        .send({});

      expect(res.status).toBe(200);
      const completedAnalysis = await waitForAnalysis(res.body.data.analysis._id);
      expect(completedAnalysis.result.userCodeReview).toBeDefined();
      expect(completedAnalysis.result.complexities).toBeDefined();
      expect(completedAnalysis.result.problemExplanation).toBeUndefined();
    });

    it('Test D: should preserve analysisDepth quick or deep', async () => {
      const aliceToken = await getAuthToken(mockUser1);
      const alice = await User.findOne({ email: mockUser1.email });
      
      const probQuick = await createMockProblem(alice._id, {
        requestedSections: ['problemExplanation'],
        analysisDepth: 'quick',
      });
      const probDeep = await createMockProblem(alice._id, {
        requestedSections: ['problemExplanation'],
        analysisDepth: 'deep',
      });

      expect(probQuick.analysisDepth).toBe('quick');
      expect(probDeep.analysisDepth).toBe('deep');
    });

    it('Test E: should reject an empty requestedSections array with 400 validation error', async () => {
      const token = await getAuthToken(mockUser1);
      const res = await request(app)
        .post('/api/v1/problems')
        .set('Cookie', [`accessToken=${token}`])
        .send({
          title: 'Empty Sections',
          problemStatement: 'Write a function that reverses a string.',
          requestedSections: [],
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('AlgoMentor Strict Validator and Fallback Unit Tests', () => {
    it('Test A: Full Solution missing complexities and approaches have no complexity -> Expected failure', async () => {
      const { parseAnalysisResult } = await import('../validators/analysisResult.validator.js');
      const rawResult = JSON.stringify({
        problemExplanation: 'Explanation',
        approaches: [
          {
            name: 'Brute Force',
            category: 'bruteForce',
            intuition: 'Intuition',
            steps: ['Step 1'],
            timeComplexity: '',
            spaceComplexity: '',
            code: 'class BruteForce {};'
          }
        ]
      });
      // requestedSections includes complexities, but both direct complexities and approaches' complexity are missing/empty.
      // Expected to throw missing section error.
      expect(() =>
        parseAnalysisResult({
          rawResult,
          requestedSections: ['problemExplanation', 'approaches', 'complexities'],
        })
      ).toThrow(/missing requested section: complexities/);
    });

    it('Test B: Full Solution missing comparison and approaches contain complete comparison data -> Expected valid derived comparison', async () => {
      const { parseAnalysisResult } = await import('../validators/analysisResult.validator.js');
      const rawResult = JSON.stringify({
        problemExplanation: 'Explanation',
        approaches: [
          {
            name: 'Brute Force',
            category: 'bruteForce',
            intuition: 'Intuition',
            steps: ['Step 1'],
            timeComplexity: 'O(N^2)',
            spaceComplexity: 'O(1)',
            code: 'class BruteForce {};',
            advantages: ['simple'],
            disadvantages: ['slow']
          }
        ]
      });
      const result = parseAnalysisResult({
        rawResult,
        requestedSections: ['problemExplanation', 'approaches', 'comparison'],
      });
      expect(result.comparison).toBeDefined();
      expect(result.comparison[0].approach).toBe('Brute Force');
      expect(result.comparison[0].timeComplexity).toBe('O(N^2)');
      expect(result.comparison[0].spaceComplexity).toBe('O(1)');
      expect(result.comparison[0].advantages).toEqual(['simple']);
      expect(result.comparison[0].disadvantages).toEqual(['slow']);
    });

    it('Test C: Partial request with two sections -> Expected only those two sections saved', async () => {
      const { parseAnalysisResult } = await import('../validators/analysisResult.validator.js');
      const rawResult = JSON.stringify({
        problemExplanation: 'Explanation',
        pattern: { name: 'Sliding Window', clues: ['clue1'], reason: 'reason1' },
        inputOutput: 'Input output info'
      });
      const result = parseAnalysisResult({
        rawResult,
        requestedSections: ['problemExplanation', 'pattern'],
      });
      expect(result.problemExplanation).toBe('Explanation');
      expect(result.pattern.name).toBe('Sliding Window');
      expect(result.inputOutput).toBeUndefined();
    });

    it('Test D: Malformed complexity data -> Expected validation failure, not an empty table', async () => {
      const { parseAnalysisResult } = await import('../validators/analysisResult.validator.js');
      // Malformed complexities (e.g. object array element is missing required timeReason/spaceReason strings or has invalid structure)
      const rawResult = JSON.stringify({
        problemExplanation: 'Explanation',
        complexities: [
          {
            approach: 'Brute Force',
            timeComplexity: 'O(N^2)',
            // timeReason is missing
            spaceComplexity: 'O(1)',
            spaceReason: 'In place'
          }
        ]
      });
      expect(() =>
        parseAnalysisResult({
          rawResult,
          requestedSections: ['problemExplanation', 'complexities'],
        })
      ).toThrow(/validation failed/);
    });
  });
});
