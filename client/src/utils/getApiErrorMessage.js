/**
 * Safely extracts a meaningful user-friendly error message from an Axios error response.
 */
const getApiErrorMessage = (error) => {
  if (error?.response?.data) {
    const data = error.response.data;

    // 1. Prefer general message
    if (data.message) {
      return data.message;
    }

    // 2. Extract first message from errors array (e.g. validator fields array [{ field, message }])
    if (Array.isArray(data.errors) && data.errors.length > 0) {
      const firstError = data.errors[0];
      if (typeof firstError === 'string') {
        return firstError;
      }
      if (firstError && typeof firstError === 'object' && firstError.message) {
        return firstError.message;
      }
    }
  }

  // 3. Fallback to basic Axios message
  if (error?.message) {
    return error.message;
  }

  // 4. Default fallback
  return 'Something went wrong. Please try again.';
};

export { getApiErrorMessage };
export default getApiErrorMessage;
