import { StudentPatternProfile } from '../models/studentPatternProfile.model.js';
import { Problem } from '../models/problem.model.js';

const normalizeKey = (name) => {
  if (!name) return 'other';
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, '-');
};

const updatePatternProgressFromAnalysis = async ({ analysis, problem }) => {
  if (!analysis || !problem) {
    throw new Error('Analysis and Problem objects are required');
  }

  // 1. Gather all pattern candidates
  const candidates = [];

  // Pattern name from Gemini analysis
  const genPatternName = analysis.result?.pattern?.name;
  if (genPatternName && genPatternName.trim().length > 0) {
    candidates.push({
      name: genPatternName,
      key: normalizeKey(genPatternName),
    });
  }

  // Patterns from user tags
  if (problem.patterns && problem.patterns.length > 0) {
    problem.patterns.forEach((p) => {
      if (p && p.trim().length > 0) {
        candidates.push({
          name: p,
          key: normalizeKey(p),
        });
      }
    });
  }

  // Fallback to topic name if no patterns are found
  const primaryTopic = problem.topics && problem.topics.length > 0 ? problem.topics[0] : 'other';
  if (candidates.length === 0) {
    candidates.push({
      name: primaryTopic,
      key: normalizeKey(primaryTopic),
    });
  }

  // Deduplicate candidates by key
  const uniquePatterns = [];
  const seen = new Set();
  candidates.forEach((c) => {
    if (!seen.has(c.key)) {
      seen.add(c.key);
      uniquePatterns.push(c);
    }
  });

  const now = new Date();

  // 2. Iterate and update each pattern profile
  for (const pat of uniquePatterns) {
    let profile = await StudentPatternProfile.findOne({
      owner: analysis.owner,
      patternKey: pat.key,
    });

    if (!profile) {
      profile = new StudentPatternProfile({
        owner: analysis.owner,
        patternKey: pat.key,
        displayName: pat.name,
        topic: primaryTopic,
        confidenceScore: 40,
      });
    }

    // Attempt tracking
    profile.attemptCount += 1;
    profile.successfulAttempts += 1; // Service only runs for completed analyses

    // Learning signals
    const missedEdgeCases = analysis.result?.missingEdgeCases?.length || 0;
    profile.missedEdgeCaseCount += missedEdgeCases;

    const bugs = analysis.result?.userCodeReview?.bugs?.length || 0;
    profile.codeIssueCount += bugs;

    // Brute force dependence check
    let isBruteForce = false;
    const reviewText = JSON.stringify(analysis.result?.userCodeReview || {}).toLowerCase();
    const improvementText = JSON.stringify(analysis.result?.approachImprovement || {}).toLowerCase();
    if (
      reviewText.includes('brute force') ||
      reviewText.includes('naive') ||
      improvementText.includes('brute force') ||
      improvementText.includes('naive')
    ) {
      isBruteForce = true;
      profile.bruteForceDependenceCount += 1;
    }

    // Confidence formula updates
    let diff = 0;
    const isCorrect = analysis.result?.userCodeReview?.isCorrect;

    if (isCorrect === true) {
      diff += 15;
      if (bugs === 0) diff += 5;
    } else if (isCorrect === false) {
      diff -= 10;
    }

    diff -= missedEdgeCases * 3;
    diff -= bugs * 2;

    if (isBruteForce) {
      diff -= 8;
    }

    // Spaced repetitions buffer
    if (profile.attemptCount > 0) {
      diff += Math.min(5, profile.attemptCount);
    }

    const currentConf = profile.confidenceScore || 40;
    const newConf = Math.min(100, Math.max(0, currentConf + diff));
    profile.confidenceScore = newConf;

    // Spaced-revision date configuration
    let days = 3;
    if (newConf <= 30) days = 1;
    else if (newConf <= 50) days = 3;
    else if (newConf <= 70) days = 7;
    else if (newConf <= 85) days = 14;
    else days = 30;

    const nextRevisionAt = new Date();
    nextRevisionAt.setDate(nextRevisionAt.getDate() + days);

    profile.nextRevisionAt = nextRevisionAt;
    profile.lastPractisedAt = now;
    profile.lastProblem = problem._id;
    profile.lastAnalysis = analysis._id;

    await profile.save();

    // 3. Sync Problem's revision date if blank or further out
    if (!problem.nextRevisionAt || problem.nextRevisionAt > nextRevisionAt) {
      await Problem.findByIdAndUpdate(problem._id, {
        $set: { nextRevisionAt },
      });
      problem.nextRevisionAt = nextRevisionAt;
    }
  }
};

export { updatePatternProgressFromAnalysis };
export default updatePatternProgressFromAnalysis;
