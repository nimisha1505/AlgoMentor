import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { vi, beforeAll, afterAll, beforeEach } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables using deterministic path resolution
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Enforce MONGODB_TEST_URI check and connect to test database
beforeAll(async () => {
  const testUri = process.env.MONGODB_TEST_URI;
  if (!testUri || testUri.trim() === '') {
    throw new Error(
      'CRITICAL CONFIGURATION ERROR: MONGODB_TEST_URI environment variable is not defined. Tests requiring MongoDB must not run against the production database.'
    );
  }
  await mongoose.connect(testUri);
});

// Clear all collections before each individual test for state isolation
beforeEach(async () => {
  if (mongoose.connection.readyState !== 0) {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  }
});

// Clean database connections after all suites complete
afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
});

// Mock Gemini prompt generation services globally for reliability
vi.mock('../services/geminiAnalysis.service.js', () => ({
  generateProblemAnalysis: vi.fn().mockImplementation(async () => ({
    result: {
      problemExplanation: 'Mocked explanation content',
      inputOutput: 'Mocked input and output format specifications',
      exampleExplanation: [{ exampleNumber: 1, explanation: 'Walkthrough description' }],
      constraints: [{ constraint: 'Mock constraint', implication: 'Constraint details' }],
      edgeCases: [{ case: 'Edge case 1', reason: 'Edge case details' }],
      missingEdgeCases: [{ case: 'Empty array', whyItMatters: 'Triggers exception', howItBreaksCurrentApproach: 'Throws null exception', testInput: '[]' }],
      pattern: { name: 'sliding-window', clues: ['two pointers moving'], reason: 'Indices move forward' },
      hints: [{ level: 1, hint: 'First hint' }],
      pseudocode: ['Initialize pointers', 'Iterate elements'],
      userCodeReview: { 
        summary: 'Good job', 
        isCorrect: true, 
        strengths: ['clean layout'], 
        bugs: [], 
        missedEdgeCases: [], 
        timeComplexity: 'O(N)', 
        spaceComplexity: 'O(1)', 
        improvements: [], 
        correctedCode: '' 
      },
      approaches: [
        { 
          name: 'Brute Force', 
          category: 'bruteForce', 
          intuition: 'Check all pairs', 
          steps: ['nested loop'], 
          timeComplexity: 'O(N^2)', 
          spaceComplexity: 'O(1)', 
          pseudocode: ['loop i', 'loop j'],
          code: 'class BruteForce {};' 
        },
        { 
          name: 'Optimal Approach', 
          category: 'optimal', 
          intuition: 'Use two pointers', 
          steps: ['two pointers step'], 
          timeComplexity: 'O(N)', 
          spaceComplexity: 'O(1)', 
          pseudocode: ['initialize pointers', 'move pointers'],
          code: 'class Optimal {};' 
        }
      ],
      approachImprovement: { 
        currentStrengths: ['simple logic'], 
        bottlenecks: ['Inefficient loops'], 
        unnecessaryWork: ['redundant comparisons'], 
        nextImprovement: 'Use linear scan', 
        improvedApproach: 'optimal', 
        patternToLearn: 'Two pointers', 
        questionsToAsk: ['Can we do it in one pass?'] 
      },
      approachExplanations: [
        { approach: 'Brute Force', explanation: 'Simple brute force' },
        { approach: 'Optimal Approach', explanation: 'Linear optimal solution' }
      ],
      codes: [
        { approach: 'Brute Force', language: 'cpp', code: 'class BruteForce {};' },
        { approach: 'Optimal Approach', language: 'cpp', code: 'class Optimal {};' }
      ],
      complexities: [
        { approach: 'Brute Force', timeComplexity: 'O(N^2)', timeReason: 'nested loops', spaceComplexity: 'O(1)', spaceReason: 'no extra memory' },
        { approach: 'Optimal Approach', timeComplexity: 'O(N)', timeReason: 'single pass', spaceComplexity: 'O(1)', spaceReason: 'no extra memory' }
      ],
      dryRun: {
        approach: 'Optimal Approach',
        input: 'target = 9',
        steps: ['start pointers', 'add elements', 'match found'],
        output: '[0, 1]'
      },
      comparison: [
        { 
          approach: 'Brute Force', 
          mainIdea: 'Check all pairs', 
          timeComplexity: 'O(N^2)', 
          spaceComplexity: 'O(1)', 
          advantages: ['Simple'], 
          disadvantages: ['Slow'], 
          interviewSuitability: 'Poor',
          recommendedUse: 'Small inputs'
        },
        { 
          approach: 'Optimal Approach', 
          mainIdea: 'Use hash map', 
          timeComplexity: 'O(N)', 
          spaceComplexity: 'O(1)', 
          advantages: ['Fast'], 
          disadvantages: ['Extra space'], 
          interviewSuitability: 'Excellent',
          recommendedUse: 'Standard production'
        }
      ],
      interviewExplanation: 'First search for pairs then optimize with pointers.',
    },
    modelName: 'gemini-mock',
    usage: { promptTokenCount: 100, candidatesTokenCount: 150, totalTokenCount: 250 },
  })),
}));

vi.mock('../services/analysisFollowUp.service.js', () => ({
  generateAnalysisFollowUp: vi.fn().mockImplementation(async () => ({
    answer: 'Mocked follow-up mentor answer explanation.',
    modelName: 'gemini-mock',
    usage: { promptTokenCount: 50, candidatesTokenCount: 80, totalTokenCount: 130 },
  })),
}));
