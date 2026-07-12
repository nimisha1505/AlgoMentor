import axiosClient from './axiosClient.js';

/**
 * Create a new DSA problem.
 */
const createProblem = async (problemData) => {
  const response = await axiosClient.post('/problems', problemData);
  return response.data.data.problem;
};

/**
 * Fetch a list of user problems with page, limit, status, language, search, topic, confidence, bookmark, and revision due filters.
 */
const getMyProblems = async ({
  page = 1,
  limit = 10,
  status,
  language,
  source,
  difficulty,
  search,
  topic,
  confidence,
  isBookmarked,
  revisionDue,
} = {}) => {
  const params = {};
  if (page) params.page = page;
  if (limit) params.limit = limit;
  if (status) params.status = status;
  if (language) params.language = language;
  if (source) params.source = source;
  if (difficulty) params.difficulty = difficulty;
  if (search && search.trim() !== '') params.search = search.trim();
  if (topic) params.topic = topic;
  if (confidence) params.confidence = confidence;
  if (isBookmarked !== undefined) params.isBookmarked = isBookmarked;
  if (revisionDue !== undefined) params.revisionDue = revisionDue;

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

/**
 * Update only learning metadata for a problem.
 */
const updateProblemLearning = async (problemId, updates) => {
  const response = await axiosClient.patch(`/problems/${problemId}/learning`, updates);
  return response.data.data.problem;
};

/**
 * Scrape problem details from an external platform URL.
 */
const importProblemFromUrl = async (url) => {
  const response = await axiosClient.post('/problems/import', { url });
  return response.data.data.importedProblem;
};

export {
  createProblem,
  getMyProblems,
  getProblemById,
  deleteProblem,
  updateProblem,
  updateProblemLearning,
  importProblemFromUrl,
};
