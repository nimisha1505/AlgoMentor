import request from 'supertest';
import { describe, it, expect } from 'vitest';
import mongoose from 'mongoose';
import { app } from '../app.js';
import { User } from '../models/user.model.js';
import { Problem } from '../models/problem.model.js';
import { RecommendationProgress } from '../models/recommendationProgress.model.js';

describe('AlgoMentor Feature Bundle Integration Tests', () => {
  const getAuthToken = async () => {
    const rand = Math.random().toString(36).substring(7);
    const user = await User.create({
      fullName: 'Jane Doe',
      username: `janedoe_${rand}`,
      email: `jane_${rand}@example.com`,
      password: 'Password123!',
    });
    return user.generateAccessToken();
  };

  describe('User Learning Preferences API', () => {
    it('should successfully get default preferences', async () => {
      const token = await getAuthToken();
      const res = await request(app)
        .get('/api/v1/users/preferences')
        .set('Cookie', [`accessToken=${token}`]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.learningPreferences).toBeDefined();
      expect(res.body.data.learningPreferences.preferredLanguage).toBe('cpp');
      expect(res.body.data.learningPreferences.currentLevel).toBe('beginner');
    });

    it('should successfully update preferences with valid payload', async () => {
      const token = await getAuthToken();
      const res = await request(app)
        .patch('/api/v1/users/preferences')
        .set('Cookie', [`accessToken=${token}`])
        .send({
          preferredLanguage: 'python',
          currentLevel: 'intermediate',
          dailyPracticeGoal: 5,
          explanationDepth: 'detailed',
          targetCompanies: ['Google', 'Meta'],
          preferredDifficulty: 'medium',
        });

      if (res.status !== 200) {
        console.error('UPDATE PREF ERROR:', JSON.stringify(res.body));
      }

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.learningPreferences.preferredLanguage).toBe('python');
      expect(res.body.data.learningPreferences.currentLevel).toBe('intermediate');
      expect(res.body.data.learningPreferences.dailyPracticeGoal).toBe(5);
      expect(res.body.data.learningPreferences.explanationDepth).toBe('detailed');
      expect(res.body.data.learningPreferences.targetCompanies).toContain('Google');
      expect(res.body.data.learningPreferences.preferredDifficulty).toBe('medium');
    });

    it('should reject invalid preferences values via Zod', async () => {
      const token = await getAuthToken();
      const res = await request(app)
        .patch('/api/v1/users/preferences')
        .set('Cookie', [`accessToken=${token}`])
        .send({
          preferredLanguage: 'ruby', // Invalid language enum
          dailyPracticeGoal: 50, // Max limit 20
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Problem Link URL Import API', () => {
    it('should reject unsafe or unsupported URL formats', async () => {
      const token = await getAuthToken();
      const res = await request(app)
        .post('/api/v1/problems/import')
        .set('Cookie', [`accessToken=${token}`])
        .send({
          url: 'http://unsafe-domain.com/problem',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should allow valid HTTPS LeetCode/GFG URLs and return imported problem template mock', async () => {
      const token = await getAuthToken();
      const res = await request(app)
        .post('/api/v1/problems/import')
        .set('Cookie', [`accessToken=${token}`])
        .send({
          url: 'https://leetcode.com/problems/two-sum/',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.importedProblem.title).toBeDefined();
      expect(res.body.data.importedProblem.source).toBe('leetcode');
    });
  });

  describe('Duplicate Problem Detection', () => {
    it('should return 409 Conflict if problem with same owner/source/externalId already exists', async () => {
      const token = await getAuthToken();
      
      // Save problem once
      await request(app)
        .post('/api/v1/problems')
        .set('Cookie', [`accessToken=${token}`])
        .send({
          title: 'Two Sum Duplicate Test',
          problemStatement: 'Given target, sum two elements.',
          language: 'cpp',
          requestedSections: ['problemExplanation'],
          source: 'leetcode',
          externalProblemId: 'two-sum-dup',
        });

      // Try to save again
      const res = await request(app)
        .post('/api/v1/problems')
        .set('Cookie', [`accessToken=${token}`])
        .send({
          title: 'Two Sum Duplicate Test Second Try',
          problemStatement: 'Given target, sum two elements.',
          language: 'cpp',
          requestedSections: ['problemExplanation'],
          source: 'leetcode',
          externalProblemId: 'two-sum-dup',
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.data.existingProblem).toBeDefined();
    });
  });

  describe('Recommendation Progress and Ranking Personalisation', () => {
    it('should successfully update and fetch recommendation progress', async () => {
      const token = await getAuthToken();
      const recKey = 'two-sum-recommendation';

      const updateRes = await request(app)
        .patch(`/api/v1/practice/recommendations/${recKey}`)
        .set('Cookie', [`accessToken=${token}`])
        .send({
          status: 'attempted',
          feedback: 'tooEasy',
          title: 'Two Sum Demo Rec',
          pattern: 'Two Pointers',
          topic: 'arrays',
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.success).toBe(true);
      expect(updateRes.body.data.progress.status).toBe('attempted');
      expect(updateRes.body.data.progress.feedback).toBe('tooEasy');

      const fetchRes = await request(app)
        .get('/api/v1/practice/recommendations/progress')
        .set('Cookie', [`accessToken=${token}`]);

      expect(fetchRes.status).toBe(200);
      expect(fetchRes.body.success).toBe(true);
      expect(fetchRes.body.data.progressList).toBeInstanceOf(Array);
      expect(fetchRes.body.data.progressList.length).toBeGreaterThan(0);
    });

    it('should adjust personalized recommendations response payload', async () => {
      const token = await getAuthToken();
      const res = await request(app)
        .get('/api/v1/practice/recommendations')
        .set('Cookie', [`accessToken=${token}`]);

      console.log('RECOMMENDATIONS DATA:', JSON.stringify(res.body));
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.recommendations.weakPatternPractice).toBeDefined();
      expect(res.body.data.recommendations.importantInterviewPatterns).toBeDefined();
    });
  });
});
