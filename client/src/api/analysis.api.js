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

/**
 * Retrieve paginated history of AI analysis attempts for a specific problem.
 */
const getProblemAnalyses = async (problemId, {
  page = 1,
  limit = 10,
  status,
  sort = 'newest'
} = {}) => {
  const params = {};
  if (page) params.page = page;
  if (limit) params.limit = limit;
  if (status) params.status = status;
  if (sort) params.sort = sort;

  const response = await axiosClient.get(`/problems/${problemId}/analyses`, { params });
  return response.data.data;
};

/**
 * Submit a follow-up question for a completed analysis.
 */
const createAnalysisFollowUp = async (analysisId, { question, mode }) => {
  const response = await axiosClient.post(`/analyses/${analysisId}/follow-ups`, { question, mode });
  return response.data.data.followUp;
};

/**
 * Retrieve previous follow-up questions for a completed analysis.
 */
const getAnalysisFollowUps = async (analysisId) => {
  const response = await axiosClient.get(`/analyses/${analysisId}/follow-ups`);
  return response.data.data.followUps;
};

/**
 * Compare two completed analysis attempts.
 */
const compareProblemAnalyses = async (problemId, firstAnalysisId, secondAnalysisId) => {
  const response = await axiosClient.get(`/problems/${problemId}/analyses/compare`, {
    params: { firstAnalysisId, secondAnalysisId },
  });
  return response.data.data;
};

/**
 * Generate code on-demand for a single approach of an analysis.
 */
const generateApproachCode = async (analysisId, approachIndex) => {
  const response = await axiosClient.post(`/analyses/${analysisId}/approaches/${approachIndex}/code`);
  return response.data.data;
};

/**
 * Generate dry run on-demand for a single approach of an analysis.
 */
const generateApproachDryRun = async (analysisId, approachIndex) => {
  const response = await axiosClient.post(`/analyses/${analysisId}/approaches/${approachIndex}/dry-run`);
  return response.data.data;
};

export {
  startProblemAnalysis,
  getLatestProblemAnalysis,
  getAnalysisById,
  getProblemAnalyses,
  createAnalysisFollowUp,
  getAnalysisFollowUps,
  compareProblemAnalyses,
  generateApproachCode,
  generateApproachDryRun,
};
