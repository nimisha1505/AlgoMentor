import { StudentPatternProfile } from '../models/studentPatternProfile.model.js';
import { Problem } from '../models/problem.model.js';
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

  // 1. Fetch user records
  const [profiles, savedProblems] = await Promise.all([
    StudentPatternProfile.find({ owner: userId }),
    Problem.find({ owner: userId }),
  ]);

  const now = new Date();

  // Helper to find profile for a pattern
  const getProfile = (patternName) => {
    const pKey = normalizeKey(patternName);
    return profiles.find((p) => p.patternKey === pKey);
  };

  // Filter out catalogue items that already match a saved problem title
  const unsavedCatalogue = practiceQuestionCatalogue.filter((item) => {
    const match = savedProblems.some((sp) => {
      const spTitle = (sp.title || '').toLowerCase().trim();
      const catTitle = (item.title || '').toLowerCase().trim();
      return spTitle.includes(catTitle) || catTitle.includes(spTitle);
    });
    return !match;
  });

  // 2. Score each catalogue question
  const scoredItems = unsavedCatalogue.map((item) => {
    const profile = getProfile(item.pattern);
    let score = item.importance || 50;
    let patternConfidence = 50;

    if (profile) {
      patternConfidence = profile.confidenceScore || 40;
      // Lower confidence -> higher score boost
      score += (100 - patternConfidence) * 1.5;

      // Overdue revision -> boost
      if (profile.nextRevisionAt && profile.nextRevisionAt < now) {
        score += 35;
      }

      // Missed edge cases, brute force, code issues
      score += (profile.missedEdgeCaseCount || 0) * 3;
      score += (profile.bruteForceDependenceCount || 0) * 5;
      score += (profile.codeIssueCount || 0) * 2;

      // Days since last practiced
      if (profile.lastPractisedAt) {
        const msDiff = now - new Date(profile.lastPractisedAt);
        const days = Math.floor(msDiff / (1000 * 60 * 60 * 24));
        score += Math.min(25, days * 0.5);
      }
    }

    return {
      ...item,
      score,
      patternConfidence,
      profile,
    };
  });

  // Sort by score descending
  scoredItems.sort((a, b) => b.score - a.score);

  // 3. Build recommendations grouped by category
  const weakPatternPractice = [];
  const importantInterviewPatterns = [];
  const reviseNow = [];
  const nextDifficultyStep = [];

  for (const item of scoredItems) {
    const prof = item.profile;
    let reason = '';
    let recType = '';

    // A. Determine if it's a weak pattern
    if (prof && prof.confidenceScore < 60 && weakPatternPractice.length < 3) {
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
        topic: item.topic,
        pattern: item.pattern,
        difficulty: item.difficulty,
        focus: item.focus,
        reason,
        recommendationType: recType,
        progressionLevel: item.progressionLevel,
        importance: item.importance,
        patternConfidence: item.patternConfidence,
      });
      continue;
    }

    // B. Determine if it's an overdue revision pattern
    if (prof && prof.nextRevisionAt && prof.nextRevisionAt < now && reviseNow.length < 3) {
      recType = 'reviseNow';
      reason = `Your revision for ${item.pattern} is overdue. Reactivate this pattern.`;

      reviseNow.push({
        title: item.title,
        topic: item.topic,
        pattern: item.pattern,
        difficulty: item.difficulty,
        focus: item.focus,
        reason,
        recommendationType: recType,
        progressionLevel: item.progressionLevel,
        importance: item.importance,
        patternConfidence: item.patternConfidence,
      });
      continue;
    }

    // C. Important interview pattern (importance > 85)
    if (item.importance > 85 && importantInterviewPatterns.length < 3) {
      recType = 'importantInterviewPatterns';
      reason = `This is a high-frequency interview pattern you have not practiced recently.`;

      importantInterviewPatterns.push({
        title: item.title,
        topic: item.topic,
        pattern: item.pattern,
        difficulty: item.difficulty,
        focus: item.focus,
        reason,
        recommendationType: recType,
        progressionLevel: item.progressionLevel,
        importance: item.importance,
        patternConfidence: item.patternConfidence,
      });
      continue;
    }

    // D. Next difficulty step
    if (nextDifficultyStep.length < 3) {
      recType = 'nextDifficultyStep';
      reason = `Step up your ${item.topic} skills with this challenging ${item.difficulty} question.`;

      nextDifficultyStep.push({
        title: item.title,
        topic: item.topic,
        pattern: item.pattern,
        difficulty: item.difficulty,
        focus: item.focus,
        reason,
        recommendationType: recType,
        progressionLevel: item.progressionLevel,
        importance: item.importance,
        patternConfidence: item.patternConfidence,
      });
    }
  }

  // Combine and limit total returned items
  return {
    weakPatternPractice,
    importantInterviewPatterns,
    reviseNow,
    nextDifficultyStep,
  };
};

export { getPersonalisedRecommendations };
export default getPersonalisedRecommendations;
