import { validateUrlSecurity } from './urlSecurity.js';
import { ApiError } from '../../utils/ApiError.js';

/**
 * Extracts GFG problem slug.
 */
const parseGfgSlug = (urlStr) => {
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
 * Derives a human-readable title from GFG slug.
 */
const deriveTitleFromSlug = (slug) => {
  if (!slug) return 'Unknown Problem';
  return slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * GFG Adapter parsing HTML securely using plain text methods.
 */
const importGfgProblem = async (urlStr) => {
  const parsedUrl = validateUrlSecurity(urlStr);
  const slug = parseGfgSlug(urlStr);

  if (!slug) {
    throw new ApiError(400, 'Could not extract problem slug from GeeksforGeeks URL');
  }

  const defaultResult = {
    title: deriveTitleFromSlug(slug),
    difficulty: 'unknown',
    source: 'gfg',
    sourceUrl: urlStr,
    externalProblemId: slug,
    problemStatement: '',
    constraints: [],
    examples: [],
    topics: [],
    patterns: [],
    partialImport: true,
    warning: 'We detected the GeeksforGeeks problem, but could not import the full content. Please paste the problem statement manually.',
  };

  try {
    const response = await fetch(urlStr, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Accept: 'text/html,application/xhtml+xml',
      },
    });

    if (response.ok) {
      const html = await response.text();

      // Extract Title
      let title = deriveTitleFromSlug(slug);
      const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
      if (titleMatch && titleMatch[1]) {
        title = titleMatch[1]
          .replace(/-\s*GeeksforGeeks.*/i, '')
          .replace(/problems\s*:\s*/i, '')
          .trim();
      }

      // Extract Difficulty
      let difficulty = 'unknown';
      const difficultyMatch = html.match(/difficulty\s*["']?\s*:\s*["'](easy|medium|hard)["']/i) || 
                              html.match(/(?:div|span)[^>]*class="[^"]*difficulty[^"]*"[^>]*>\s*(easy|medium|hard)/i);
      if (difficultyMatch && difficultyMatch[1]) {
        difficulty = difficultyMatch[1].toLowerCase();
      }

      // Extract problem statement div content defensively
      let statementText = '';
      const statementMatch = html.match(/class="[^"]*problem-statement[^"]*"[^>]*>([\s\S]*?)<\/div>/i) ||
                             html.match(/class="[^"]*problems_problem_content[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
      if (statementMatch && statementMatch[1]) {
        statementText = statementMatch[1]
          // strip script elements
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          // strip style elements
          .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
          // strip all html tags
          .replace(/<[^>]*>/g, ' ')
          // replace duplicate whitespace
          .replace(/\s+/g, ' ')
          .trim();
      }

      return {
        title,
        difficulty,
        source: 'gfg',
        sourceUrl: urlStr,
        externalProblemId: slug,
        problemStatement: statementText || '',
        constraints: [],
        examples: [],
        topics: [],
        patterns: [],
        partialImport: !statementText,
        warning: statementText
          ? undefined
          : 'We detected the GeeksforGeeks problem, but could not import the full content. Please paste the problem statement manually.',
      };
    }
  } catch (err) {
    // Fail gracefully and return partial import fallback
  }

  return defaultResult;
};

export { importGfgProblem, parseGfgSlug };
export default importGfgProblem;
