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
      constraints: ['Mock constraint'],
      edgeCases: ['Edge case 1'],
      missingEdgeCases: [{ case: 'Empty array', whyItMatters: 'Triggers exception', howItBreaksCurrentApproach: 'Throws null exception' }],
      pattern: { name: 'sliding-window', reason: 'Indices move forward' },
      hints: [{ level: 1, hint: 'First hint' }],
      userCodeReview: { isCorrect: true, summary: 'Good job', bugs: [] },
      approachImprovement: { bottlenecks: ['Inefficient loops'], patternToLearn: 'Two pointers' },
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
