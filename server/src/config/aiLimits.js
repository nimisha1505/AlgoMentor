const getLimit = (envVal, defaultValue) => {
  const parsed = parseInt(envVal, 10);
  if (isNaN(parsed) || parsed <= 0) {
    return defaultValue;
  }
  return parsed;
};

const DAILY_ANALYSIS_LIMIT = getLimit(process.env.DAILY_ANALYSIS_LIMIT, 20);
const DAILY_FOLLOWUP_LIMIT = getLimit(process.env.DAILY_FOLLOWUP_LIMIT, 50);
const DAILY_TOKEN_LIMIT = getLimit(process.env.DAILY_TOKEN_LIMIT, 250000);

export { DAILY_ANALYSIS_LIMIT, DAILY_FOLLOWUP_LIMIT, DAILY_TOKEN_LIMIT };
