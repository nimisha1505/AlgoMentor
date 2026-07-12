import { validateUrlSecurity } from './urlSecurity.js';
import { ApiError } from '../../utils/ApiError.js';

/**
 * Extracts the title slug parameter from a valid LeetCode URL.
 */
const parseLeetCodeSlug = (urlStr) => {
  try {
    const parsed = new URL(urlStr);
    const paths = parsed.pathname.split('/').filter(Boolean);
    const problemsIdx = paths.indexOf('problems');
    if (problemsIdx !== -1 && paths[problemsIdx + 1]) {
      return paths[problemsIdx + 1];
    }
  } catch (e) {
    // Ignore
  }
  return '';
};

/**
 * Derives a human-readable title from slug parameter.
 */
const deriveTitleFromSlug = (slug) => {
  if (!slug) return 'Unknown Problem';
  return slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * LeetCode Adapter importing metadata. Returns partial import if blocked or fails.
 */
const importLeetCodeProblem = async (urlStr) => {
  const parsedUrl = validateUrlSecurity(urlStr);
  const slug = parseLeetCodeSlug(urlStr);

  if (!slug) {
    throw new ApiError(400, 'Could not extract problem slug from LeetCode URL');
  }

  const defaultResult = {
    title: deriveTitleFromSlug(slug),
    difficulty: 'unknown',
    source: 'leetcode',
    sourceUrl: urlStr,
    externalProblemId: slug,
    problemStatement: '',
    constraints: [],
    examples: [],
    topics: [],
    patterns: [],
    partialImport: true,
    warning: 'We detected the LeetCode problem, but could not import the full content. Please paste the problem statement manually.',
  };

  try {
    const response = await fetch('https://leetcode.com/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      body: JSON.stringify({
        query: `
          query questionData($titleSlug: String!) {
            question(titleSlug: $titleSlug) {
              title
              difficulty
              content
              topicTags {
                name
              }
            }
          }
        `,
        variables: { titleSlug: slug },
      }),
    });

    if (response.ok) {
      const resData = await response.json();
      if (resData?.data?.question) {
        const q = resData.data.question;
      const htmlContent = q.content || '';

      // Strip all HTML tags securely to keep only plaintext
      const cleanText = htmlContent
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      // Normalize topic tags
      const mappedTopics = (q.topicTags || [])
        .map((t) => t.name.toLowerCase().replace(/[^a-z0-9]/g, ''))
        .filter((t) =>
          [
            'arrays',
            'strings',
            'hashing',
            'linkedList',
            'stack',
            'queue',
            'binarySearch',
            'recursion',
            'backtracking',
            'trees',
            'bst',
            'heap',
            'graph',
            'dynamicProgramming',
            'greedy',
            'slidingWindow',
            'twoPointers',
            'prefixSum',
            'bitManipulation',
            'mathematics',
          ].includes(t)
        );

      return {
        title: q.title || deriveTitleFromSlug(slug),
        difficulty: (q.difficulty || 'unknown').toLowerCase(),
        source: 'leetcode',
        sourceUrl: urlStr,
        externalProblemId: slug,
        problemStatement: cleanText || '',
        constraints: [],
        examples: [],
        topics: mappedTopics,
        patterns: [],
        partialImport: !cleanText,
        warning: cleanText
          ? undefined
          : 'We detected the LeetCode problem, but could not import the full content. Please paste the problem statement manually.',
      };
      }
    }
  } catch (err) {
    // Graceful fallback on block or request failure
  }

  return defaultResult;
};

export { importLeetCodeProblem, parseLeetCodeSlug };
export default importLeetCodeProblem;
