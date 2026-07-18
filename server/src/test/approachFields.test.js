import request from 'supertest';
import { describe, it, expect, vi } from 'vitest';
import mongoose from 'mongoose';
import { app } from '../app.js';
import { User } from '../models/user.model.js';
import { Problem } from '../models/problem.model.js';
import { Analysis } from '../models/analysis.model.js';
import { generateApproachCode, generateApproachDryRun } from '../services/geminiAnalysis.service.js';

// Mock code and dry-run generation globally inside this test
vi.mock('../services/geminiAnalysis.service.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    generateApproachCode: vi.fn(),
    generateApproachDryRun: vi.fn(),
  };
});

describe('Approach Code & Dry-Run On-Demand Endpoints', () => {
  const mockUser = {
    fullName: 'Test User',
    username: 'test_user',
    email: 'test_user@example.com',
    password: 'Password123!',
  };

  const mockUserOther = {
    fullName: 'Other User',
    username: 'other_user',
    email: 'other_user@example.com',
    password: 'Password123!',
  };

  const getAuthToken = async (userData) => {
    let user = await User.findOne({ email: userData.email });
    if (!user) {
      user = await User.create(userData);
    }
    return user.generateAccessToken();
  };

  const createCompletedAnalysis = async (ownerId) => {
    return await Analysis.create({
      problem: new mongoose.Types.ObjectId(),
      owner: ownerId,
      status: 'completed',
      requestedSections: ['approaches'],
      inputSnapshot: {
        title: 'Two Sum',
        problemStatement: 'Sum two numbers',
        constraints: ['2 <= nums.length <= 10^4'],
        examples: [{ input: 'nums = [2,7,11,15], target = 9', output: '[0,1]', explanation: '' }],
        language: 'cpp',
        code: '',
      },
      result: {
        approaches: [
          {
            name: 'Brute Force',
            category: 'bruteForce',
            intuition: 'Nested loop',
            steps: ['check pairs'],
            pseudocode: ['for i', 'for j'],
            timeComplexity: 'O(N^2)',
            spaceComplexity: 'O(1)',
          },
          {
            name: 'Optimal',
            category: 'optimal',
            intuition: 'Hash map',
            steps: ['map check'],
            pseudocode: ['map insert'],
            timeComplexity: 'O(N)',
            spaceComplexity: 'O(N)',
          }
        ]
      }
    });
  };

  it('Complete Solution initial response does not require code or dryRun initially but requires pseudocode and complexity', async () => {
    // Test the Zod schema validation directly
    const { analysisResultSchema } = await import('../validators/analysisResult.validator.js');
    
    // 1. Valid data without code/dryRun but with pseudocode/complexities
    const validData = {
      approaches: [
        {
          name: 'Brute Force',
          category: 'bruteForce',
          intuition: 'Nested loops',
          steps: ['Loop through all pairs'],
          timeComplexity: 'O(N^2)',
          spaceComplexity: 'O(1)',
          pseudocode: ['for i in 0..n:', '  for j in i+1..n:']
        }
      ]
    };
    const parseResult = analysisResultSchema.safeParse(validData);
    expect(parseResult.success).toBe(true);

    // 2. Invalid data missing pseudocode
    const invalidDataNoPseudocode = {
      approaches: [
        {
          name: 'Brute Force',
          category: 'bruteForce',
          intuition: 'Nested loops',
          steps: ['Loop through all pairs'],
          timeComplexity: 'O(N^2)',
          spaceComplexity: 'O(1)',
        }
      ]
    };
    const parseResultNoPseudocode = analysisResultSchema.safeParse(invalidDataNoPseudocode);
    expect(parseResultNoPseudocode.success).toBe(false);

    // 3. Invalid data missing complexity
    const invalidDataNoComplexity = {
      approaches: [
        {
          name: 'Brute Force',
          category: 'bruteForce',
          intuition: 'Nested loops',
          steps: ['Loop through all pairs'],
          pseudocode: ['for i in 0..n:'],
          spaceComplexity: 'O(1)',
        }
      ]
    };
    const parseResultNoComplexity = analysisResultSchema.safeParse(invalidDataNoComplexity);
    expect(parseResultNoComplexity.success).toBe(false);
  });

  it('code endpoint generates and saves code, and repeated request returns saved code', async () => {
    const token = await getAuthToken(mockUser);
    const userObj = await User.findOne({ email: mockUser.email });
    const analysis = await createCompletedAnalysis(userObj._id);

    vi.mocked(generateApproachCode).mockResolvedValueOnce({
      code: 'class Solution { };',
      usage: { inputTokens: 5, outputTokens: 10, totalTokens: 15 }
    });

    // Request code generation
    const res = await request(app)
      .post(`/api/v1/analyses/${analysis._id}/approaches/1/code`)
      .set('Cookie', [`accessToken=${token}`]);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.approach.code).toBe('class Solution { };');
    expect(res.body.data.approach.codeGenerationStatus).toBe('completed');
    expect(res.body.data.approach.codeGeneratedAt).toBeDefined();

    // Verify it was saved in the DB
    const dbAnalysis = await Analysis.findById(analysis._id);
    expect(dbAnalysis.result.approaches[1].code).toBe('class Solution { };');
    expect(dbAnalysis.result.approaches[1].codeGenerationStatus).toBe('completed');

    // Repeated request should return saved code without calling Gemini again
    vi.mocked(generateApproachCode).mockClear();
    const resRepeat = await request(app)
      .post(`/api/v1/analyses/${analysis._id}/approaches/1/code`)
      .set('Cookie', [`accessToken=${token}`]);

    expect(resRepeat.status).toBe(200);
    expect(resRepeat.body.data.approach.code).toBe('class Solution { };');
    expect(generateApproachCode).not.toHaveBeenCalled();
  });

  it('dry-run endpoint generates and saves dry run, and repeated request returns saved trace', async () => {
    const token = await getAuthToken(mockUser);
    const userObj = await User.findOne({ email: mockUser.email });
    const analysis = await createCompletedAnalysis(userObj._id);

    vi.mocked(generateApproachDryRun).mockResolvedValueOnce({
      dryRun: {
        input: 'nums = [2,7,11,15]',
        steps: ['step 1: check 2', 'step 2: match 7'],
        output: '[0, 1]'
      },
      usage: { inputTokens: 5, outputTokens: 8, totalTokens: 13 }
    });

    // Request dry-run generation
    const res = await request(app)
      .post(`/api/v1/analyses/${analysis._id}/approaches/1/dry-run`)
      .set('Cookie', [`accessToken=${token}`]);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.approach.dryRun.output).toBe('[0, 1]');
    expect(res.body.data.approach.dryRunGenerationStatus).toBe('completed');

    // Verify DB
    const dbAnalysis = await Analysis.findById(analysis._id);
    expect(dbAnalysis.result.approaches[1].dryRun.output).toBe('[0, 1]');
    expect(dbAnalysis.result.approaches[1].dryRunGenerationStatus).toBe('completed');

    // Repeated request returns saved result directly
    vi.mocked(generateApproachDryRun).mockClear();
    const resRepeat = await request(app)
      .post(`/api/v1/analyses/${analysis._id}/approaches/1/dry-run`)
      .set('Cookie', [`accessToken=${token}`]);

    expect(resRepeat.status).toBe(200);
    expect(resRepeat.body.data.approach.dryRun.output).toBe('[0, 1]');
    expect(generateApproachDryRun).not.toHaveBeenCalled();
  });

  it('invalid approach index is rejected', async () => {
    const token = await getAuthToken(mockUser);
    const userObj = await User.findOne({ email: mockUser.email });
    const analysis = await createCompletedAnalysis(userObj._id);

    // Invalid positive index
    const res1 = await request(app)
      .post(`/api/v1/analyses/${analysis._id}/approaches/99/code`)
      .set('Cookie', [`accessToken=${token}`]);
    expect(res1.status).toBe(400);

    // Negative index should be rejected by validation schema
    const res2 = await request(app)
      .post(`/api/v1/analyses/${analysis._id}/approaches/-1/code`)
      .set('Cookie', [`accessToken=${token}`]);
    expect(res2.status).toBe(400);
  });

  it('unauthorized analysis is rejected', async () => {
    const token = await getAuthToken(mockUserOther); // Different user token
    const aliceObj = await User.create({
      fullName: 'Alice Test',
      username: 'alice_test',
      email: 'alice_test@example.com',
      password: 'Password123!',
    });
    const analysis = await createCompletedAnalysis(aliceObj._id); // Alice is the owner

    const res = await request(app)
      .post(`/api/v1/analyses/${analysis._id}/approaches/0/code`)
      .set('Cookie', [`accessToken=${token}`]);

    expect(res.status).toBe(403);
  });

  it('failure clears generation status', async () => {
    const token = await getAuthToken(mockUser);
    const userObj = await User.findOne({ email: mockUser.email });
    const analysis = await createCompletedAnalysis(userObj._id);

    vi.mocked(generateApproachCode).mockRejectedValueOnce(new Error('AI generation crashed'));

    const res = await request(app)
      .post(`/api/v1/analyses/${analysis._id}/approaches/0/code`)
      .set('Cookie', [`accessToken=${token}`]);

    expect(res.status).toBe(500);

    // Status in DB should be cleared to 'failed' (not stuck at 'generating')
    const dbAnalysis = await Analysis.findById(analysis._id);
    expect(dbAnalysis.result.approaches[0].codeGenerationStatus).toBe('failed');
  });

  it('non-complete analysis approach is rejected', async () => {
    const token = await getAuthToken(mockUser);
    const userObj = await User.findOne({ email: mockUser.email });
    
    // Create a failed/non-completed analysis, but with valid approaches array present
    const incompleteAnalysis = await Analysis.create({
      problem: new mongoose.Types.ObjectId(),
      owner: userObj._id,
      status: 'failed',
      requestedSections: ['approaches'],
      inputSnapshot: {
        title: 'Two Sum',
        problemStatement: 'Sum two numbers',
        language: 'cpp',
      },
      result: {
        approaches: [
          {
            name: 'Brute Force',
            category: 'bruteForce',
            intuition: 'Nested loop',
            steps: ['check pairs'],
            pseudocode: ['for i', 'for j'],
            timeComplexity: 'O(N^2)',
            spaceComplexity: 'O(1)',
          }
        ]
      }
    });

    const res = await request(app)
      .post(`/api/v1/analyses/${incompleteAnalysis._id}/approaches/0/code`)
      .set('Cookie', [`accessToken=${token}`]);

    expect(res.status).toBe(400);
  });

  it('code and dry-run prompts remain small and approach-specific', async () => {
    const { buildApproachCodePrompt, buildApproachDryRunPrompt } = await import('../services/analysisPrompt.service.js');
    
    const problem = { title: 'Two Sum', problemStatement: 'Sum numbers', constraints: ['2 <= nums.length <= 10'] };
    const approach = { name: 'Brute Force', category: 'bruteForce', intuition: 'Check all', steps: ['loop'], pseudocode: ['loop'] };
    const example = { input: '[1, 2]', output: '3' };

    const codePrompt = buildApproachCodePrompt({ problem, approach, language: 'python' });
    const dryRunPrompt = buildApproachDryRunPrompt({ example, approach });

    // Assert prompts are approach specific and don't contain full lesson instructions or guidelines
    expect(codePrompt).toContain('Brute Force');
    expect(codePrompt).toContain('Sum numbers');
    expect(codePrompt).toContain('python');
    expect(codePrompt).not.toContain('You are an expert DSA mentor focused on teaching rather than merely producing answers');

    expect(dryRunPrompt).toContain('Brute Force');
    expect(dryRunPrompt).toContain('[1, 2]');
    expect(dryRunPrompt).not.toContain('You are requested to generate analysis ONLY for the following sections');
  });
});
