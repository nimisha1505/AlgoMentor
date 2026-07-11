import axiosClient from './axiosClient.js';

/**
 * Queue/start AI analysis for a specific saved DSA problem.
 */
const startProblemAnalysis = async (problemId) => {
  const response = await axiosClient.post(`/problems/${problemId}/analyses`, {});
  return response.data.data.analysis;
};

/**
 * Retrieve the latest completed analysis for a specific problem.
 */
const getLatestProblemAnalysis = async (problemId) => {
  const response = await axiosClient.get(`/problems/${problemId}/analyses/latest`);
  return response.data.data.analysis;
};

/**
 * Retrieve details of a specific AI analysis by analysis ID.
 */
const getAnalysisById = async (analysisId) => {
  const response = await axiosClient.get(`/analyses/${analysisId}`);
  return response.data.data.analysis;
};

export { startProblemAnalysis, getLatestProblemAnalysis, getAnalysisById };
