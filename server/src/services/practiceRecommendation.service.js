import { StudentPatternProfile } from '../models/studentPatternProfile.model.js';
import { Problem } from '../models/problem.model.js';
import { User } from '../models/user.model.js';
import { RecommendationProgress } from '../models/recommendationProgress.model.js';
import { practiceQuestionCatalogue } from '../data/practiceQuestionCatalogue.js';

const normalizeKey = (name) => {
  if (!name) return 'other';
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, '-');
};

const getPersonalisedRecommendations = async ({ userId, limit = 10 }) => {
  if (!userId) {
    throw new Error('User ID is required');
  }

  // 1. Fetch user, progress, profiles, and saved problems
  const [user, progressList, profiles, savedProblems] = await Promise.all([
    User.findById(userId),
    RecommendationProgress.find({ owner: userId }),
    StudentPatternProfile.find({ owner: userId }),
    Problem.find({ owner: userId }),
  ]);

  const now = new Date();
  const preferences = user?.learningPreferences || {
    preferredLanguage: 'cpp',
    currentLevel: 'beginner',
    dailyPracticeGoal: 2,
    explanationDepth: 'balanced',
    targetCompanies: [],
    preferredDifficulty: 'mixed',
  };

  // Build lookup maps
  const progressMap = new Map(
    progressList.map((p) => [p.recommendationKey, p])
  );

  const getProfile = (patternName) => {
    const pKey = normalizeKey(patternName);
    return profiles.find((p) => p.patternKey === pKey);
  };

  // Filter out catalogue items matching a saved problem title
  const unsavedCatalogue = practiceQuestionCatalogue.filter((item) => {
    const match = savedProblems.some((sp) => {
      const spTitle = (sp.title || '').toLowerCase().trim();
      const catTitle = (item.title || '').toLowerCase().trim();
      return spTitle.includes(catTitle) || catTitle.includes(spTitle);
    });
    return !match;
  });

  // 2. Score each catalogue question
  const scoredItems = unsavedCatalogue
    .map((item) => {
      const recKey = normalizeKey(item.title);
      const progress = progressMap.get(recKey);
      
      const status = progress?.status || 'notStarted';
      const feedback = progress?.feedback || 'none';

      // Rule: Exclude solved and alreadySolved items
      if (status === 'solved' || feedback === 'alreadySolved') {
        return null;
      }

      const profile = getProfile(item.pattern);
      let score = item.importance || 50;
      let patternConfidence = 50;

      if (profile) {
        patternConfidence = profile.confidenceScore || 40;
        score += (100 - patternConfidence) * 1.5;

        if (profile.nextRevisionAt && profile.nextRevisionAt < now) {
          score += 35;
        }

        score += (profile.missedEdgeCaseCount || 0) * 3;
        score += (profile.bruteForceDependenceCount || 0) * 5;
        score += (profile.codeIssueCount || 0) * 2;

        if (profile.lastPractisedAt) {
          const msDiff = now - new Date(profile.lastPractisedAt);
          const days = Math.floor(msDiff / (1000 * 60 * 60 * 24));
          score += Math.min(25, days * 0.5);
        }
      }

      // Rule: Prioritise attempted problems (+50 boost)
      if (status === 'attempted') {
        score += 50;
      }

      // Rule: Reduce priority for notRelevant (-150 penalty)
      if (feedback === 'notRelevant') {
        score -= 150;
      }

      // Rule: Avoid immediately repeating tooEasy (-120 penalty)
      if (feedback === 'tooEasy') {
        score -= 120;
      }

      // Rule: Move tooDifficult problems to a later difficulty step (-80 penalty)
      if (feedback === 'tooDifficult') {
        score -= 80;
      }

      // Rule: Preserve revised history without recommending too frequently (-30 penalty)
      if (status === 'revised') {
        score -= 30;
      }

      // Personalisation using preferences (current level)
      if (preferences.currentLevel === 'beginner') {
        if (item.difficulty === 'easy') score += 40;
        else if (item.difficulty === 'medium') score += 10;
        else if (item.difficulty === 'hard') score -= 50;
      } else if (preferences.currentLevel === 'intermediate') {
        if (item.difficulty === 'medium') score += 40;
        else if (item.difficulty === 'easy') score += 10;
        else if (item.difficulty === 'hard') score += 5;
      } else if (preferences.currentLevel === 'advanced') {
        if (item.difficulty === 'hard') score += 50;
        else if (item.difficulty === 'medium') score += 20;
        else if (item.difficulty === 'easy') score -= 30;
      }

      // Personalisation using preferred difficulty
      if (preferences.preferredDifficulty === 'easy' && item.difficulty === 'easy') {
        score += 50;
      } else if (preferences.preferredDifficulty === 'medium' && item.difficulty === 'medium') {
        score += 50;
      } else if (preferences.preferredDifficulty === 'hard' && item.difficulty === 'hard') {
        score += 50;
      }

      return {
        ...item,
        score,
        patternConfidence,
        profile,
        recommendationKey: recKey,
        status,
        feedback,
      };
    })
    .filter(Boolean);

  // Sort by score descending
  scoredItems.sort((a, b) => b.score - a.score);

  // 3. Build recommendations grouped by category
  const weakPatternPractice = [];
  const importantInterviewPatterns = [];
  const reviseNow = [];
  const nextDifficultyStep = [];

  const maxItems = Math.floor(limit / 4) || 3;

  for (const item of scoredItems) {
    const prof = item.profile;
    let reason = '';
    let recType = '';

    const hasTargetCompanies = preferences.targetCompanies && preferences.targetCompanies.length > 0;
    const interviewReasonText = hasTargetCompanies
      ? `This pattern is commonly important in technical interviews for target companies like ${preferences.targetCompanies[0]}.`
      : 'This pattern is commonly important in technical interviews.';

    // A. Determine if it's a weak pattern
    if (prof && prof.confidenceScore < 60 && weakPatternPractice.length < maxItems) {
      recType = 'weakPatternPractice';
      if (prof.bruteForceDependenceCount > 0) {
        reason = `Your recent solution remained O(n²); practice maintaining an optimal ${item.pattern} instead.`;
      } else if (prof.missedEdgeCaseCount > 1) {
        reason = `You missed edge cases in ${prof.missedEdgeCaseCount} recent ${item.pattern} attempts.`;
      } else {
        reason = `Your confidence in ${item.pattern} is low (${Math.round(prof.confidenceScore)}%). Strengthen this pattern.`;
      }

      weakPatternPractice.push({
        title: item.title,
        source: 'leetcode',
        sourceUrl: `https://leetcode.com/problems/${item.key || item.recommendationKey}/`,
        externalId: item.key || item.recommendationKey,
        difficulty: item.difficulty,
        topic: item.topic,
        pattern: item.pattern,
        problemStatement: item.problemStatement || '',
        focus: item.focus,
        reason,
        recommendationType: recType,
        progressionLevel: item.progressionLevel,
        importance: item.importance,
        patternConfidence: item.patternConfidence,
        recommendationKey: item.recommendationKey,
        status: item.status,
        feedback: item.feedback,
      });
      continue;
    }

    // B. Determine if it's an overdue revision pattern
    if ((item.status === 'attempted' || (prof && prof.nextRevisionAt && prof.nextRevisionAt < now)) && reviseNow.length < maxItems) {
      recType = 'reviseNow';
      reason = item.status === 'attempted'
        ? `You recently attempted this problem. Let's practice it again to solve it completely.`
        : `Your revision for ${item.pattern} is overdue. Reactivate this pattern.`;

      reviseNow.push({
        title: item.title,
        source: 'leetcode',
        sourceUrl: `https://leetcode.com/problems/${item.key || item.recommendationKey}/`,
        externalId: item.key || item.recommendationKey,
        difficulty: item.difficulty,
        topic: item.topic,
        pattern: item.pattern,
        problemStatement: item.problemStatement || '',
        focus: item.focus,
        reason,
        recommendationType: recType,
        progressionLevel: item.progressionLevel,
        importance: item.importance,
        patternConfidence: item.patternConfidence,
        recommendationKey: item.recommendationKey,
        status: item.status,
        feedback: item.feedback,
      });
      continue;
    }

    // C. Important interview pattern (importance > 85)
    if (item.importance > 85 && importantInterviewPatterns.length < maxItems) {
      recType = 'importantInterviewPatterns';
      reason = interviewReasonText;

      importantInterviewPatterns.push({
        title: item.title,
        source: 'leetcode',
        sourceUrl: `https://leetcode.com/problems/${item.key || item.recommendationKey}/`,
        externalId: item.key || item.recommendationKey,
        difficulty: item.difficulty,
        topic: item.topic,
        pattern: item.pattern,
        problemStatement: item.problemStatement || '',
        focus: item.focus,
        reason,
        recommendationType: recType,
        progressionLevel: item.progressionLevel,
        importance: item.importance,
        patternConfidence: item.patternConfidence,
        recommendationKey: item.recommendationKey,
        status: item.status,
        feedback: item.feedback,
      });
      continue;
    }

    // D. Next difficulty step
    if (nextDifficultyStep.length < maxItems) {
      recType = 'nextDifficultyStep';
      reason = `Step up your ${item.topic} skills with this challenging ${item.difficulty} question.`;

      nextDifficultyStep.push({
        title: item.title,
        source: 'leetcode',
        sourceUrl: `https://leetcode.com/problems/${item.key || item.recommendationKey}/`,
        externalId: item.key || item.recommendationKey,
        difficulty: item.difficulty,
        topic: item.topic,
        pattern: item.pattern,
        problemStatement: item.problemStatement || '',
        focus: item.focus,
        reason,
        recommendationType: recType,
        progressionLevel: item.progressionLevel,
        importance: item.importance,
        patternConfidence: item.patternConfidence,
        recommendationKey: item.recommendationKey,
        status: item.status,
        feedback: item.feedback,
      });
    }
  }

  return {
    weakPatternPractice,
    importantInterviewPatterns,
    reviseNow,
    nextDifficultyStep,
  };
};

export { getPersonalisedRecommendations };
export default getPersonalisedRecommendations;
