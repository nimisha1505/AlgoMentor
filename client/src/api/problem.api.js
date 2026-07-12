import axiosClient from './axiosClient.js';

/**
 * Create a new DSA problem.
 */
const createProblem = async (problemData) => {
  const response = await axiosClient.post('/problems', problemData);
  return response.data.data.problem;
};

/**
 * Fetch a list of user problems with page, limit, status, language, and search filter.
 */
const getMyProblems = async ({
  page = 1,
  limit = 10,
  status,
  language,
  search,
} = {}) => {
  const params = {};
  if (page) params.page = page;
  if (limit) params.limit = limit;
  if (status) params.status = status;
  if (language) params.language = language;
  if (search && search.trim() !== '') params.search = search.trim();

  const response = await axiosClient.get('/problems', { params });
  return response.data.data;
};

/**
 * Fetch a specific saved problem by ID.
 */
const getProblemById = async (problemId) => {
  const response = await axiosClient.get(`/problems/${problemId}`);
  return response.data.data.problem;
};

/**
 * Delete a specific saved problem by ID.
 */
const deleteProblem = async (problemId) => {
  const response = await axiosClient.delete(`/problems/${problemId}`);
  return response.data;
};

/**
 * Update a specific problem by ID.
 */
const updateProblem = async (problemId, updates) => {
  const response = await axiosClient.patch(`/problems/${problemId}`, updates);
  return response.data.data.problem;
};

export { createProblem, getMyProblems, getProblemById, deleteProblem, updateProblem };
