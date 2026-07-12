import { validateUrlSecurity } from './urlSecurity.js';
import { importLeetCodeProblem, parseLeetCodeSlug } from './leetcode.adapter.js';
import { importGfgProblem, parseGfgSlug } from './gfg.adapter.js';
import { ApiError } from '../../utils/ApiError.js';

/**
 * Parses and returns platform source and external problem ID slug key.
 */
const detectProblemSource = (urlStr) => {
  try {
    const parsed = new URL(urlStr);
    const host = parsed.hostname.toLowerCase();

    if (host.includes('leetcode.com')) {
      const slug = parseLeetCodeSlug(urlStr);
      return {
        source: 'leetcode',
        externalProblemId: slug,
      };
    } else if (host.includes('geeksforgeeks.org')) {
      const slug = parseGfgSlug(urlStr);
      return {
        source: 'gfg',
        externalProblemId: slug,
      };
    }
  } catch (e) {
    // Ignore
  }
  return {
    source: 'custom',
    externalProblemId: '',
  };
};

/**
 * Dynamic coordinator routing the URL to the correct scraper adapter.
 */
const importProblemFromUrl = async (urlStr) => {
  // Validate defensively again
  const parsed = validateUrlSecurity(urlStr);
  const host = parsed.hostname.toLowerCase();

  if (host.includes('leetcode.com')) {
    return await importLeetCodeProblem(urlStr);
  } else if (host.includes('geeksforgeeks.org')) {
    return await importGfgProblem(urlStr);
  }

  throw new ApiError(400, 'Unsupported URL domain target platform');
};

export { detectProblemSource, importProblemFromUrl };
