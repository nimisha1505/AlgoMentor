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

export { getPracticeDashboard, getPracticeRecommendations };
