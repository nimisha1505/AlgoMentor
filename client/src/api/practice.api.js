import axiosClient from './axiosClient.js';

/**
 * Fetch real practice dashboard analytics.
 */
const getPracticeDashboard = async () => {
  const response = await axiosClient.get('/practice/dashboard');
  return response.data.data;
};

/**
 * Fetch personalized practice recommendations.
 */
const getPracticeRecommendations = async ({ limit = 10 } = {}) => {
  const response = await axiosClient.get('/practice/recommendations', {
    params: { limit },
  });
  return response.data.data;
};

/**
 * Fetch UTC daily AI usage limits and statistics.
 */
const getAiUsage = async () => {
  const response = await axiosClient.get('/practice/usage');
  return response.data.data;
};

const updateRecommendationProgress = async (recommendationKey, updates) => {
  const response = await axiosClient.patch(`/practice/recommendations/${recommendationKey}`, updates);
  return response.data.data.progress;
};

const getRecommendationProgress = async () => {
  const response = await axiosClient.get('/practice/recommendations/progress');
  return response.data.data.progressList;
};

const getLearningPreferences = async () => {
  const response = await axiosClient.get('/users/preferences');
  return response.data.data.learningPreferences;
};

const updateLearningPreferences = async (updates) => {
  const response = await axiosClient.patch('/users/preferences', updates);
  return response.data.data.learningPreferences;
};

export {
  getPracticeDashboard,
  getPracticeRecommendations,
  getAiUsage,
  updateRecommendationProgress,
  getRecommendationProgress,
  getLearningPreferences,
  updateLearningPreferences,
};
