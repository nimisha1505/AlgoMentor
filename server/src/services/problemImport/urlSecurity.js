import { ApiError } from '../../utils/ApiError.js';

const allowedDomains = [
  'leetcode.com',
  'www.leetcode.com',
  'geeksforgeeks.org',
  'www.geeksforgeeks.org',
];

/**
 * Validates a URL dynamically against security guidelines.
 * Throws ApiError if check fails.
 */
const validateUrlSecurity = (urlStr) => {
  try {
    const parsed = new URL(urlStr);

    if (parsed.protocol !== 'https:') {
      throw new ApiError(400, 'Protocol must be HTTPS');
    }

    if (parsed.username || parsed.password) {
      throw new ApiError(400, 'URL credentials are not allowed');
    }

    const host = parsed.hostname.toLowerCase();

    if (!allowedDomains.includes(host)) {
      throw new ApiError(400, 'Hostname is not supported or allowlisted');
    }

    const ipv4Regex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
    const ipv6Regex = /^\[?[0-9a-fA-F:]+\]?$/;
    if (
      host === 'localhost' ||
      ipv4Regex.test(host) ||
      ipv6Regex.test(host)
    ) {
      throw new ApiError(400, 'IP hosts and localhost are not allowed');
    }

    return parsed;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(400, 'Invalid URL format');
  }
};

export { validateUrlSecurity, allowedDomains };
export default validateUrlSecurity;
