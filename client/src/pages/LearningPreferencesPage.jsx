import React, { useState, useEffect } from 'react';
import { getLearningPreferences, updateLearningPreferences } from '../api/practice.api.js';
import { Save, Loader2, BookOpen, AlertCircle, CheckCircle2 } from 'lucide-react';

const LearningPreferencesPage = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [preferredLanguage, setPreferredLanguage] = useState('cpp');
  const [currentLevel, setCurrentLevel] = useState('beginner');
  const [dailyPracticeGoal, setDailyPracticeGoal] = useState(2);
  const [explanationDepth, setExplanationDepth] = useState('balanced');
  const [preferredDifficulty, setPreferredDifficulty] = useState('mixed');
  const [targetCompaniesInput, setTargetCompaniesInput] = useState('');

  useEffect(() => {
    const fetchPreferences = async () => {
      try {
        const prefs = await getLearningPreferences();
        if (prefs) {
          setPreferredLanguage(prefs.preferredLanguage || 'cpp');
          setCurrentLevel(prefs.currentLevel || 'beginner');
          setDailyPracticeGoal(prefs.dailyPracticeGoal || 2);
          setExplanationDepth(prefs.explanationDepth || 'balanced');
          setPreferredDifficulty(prefs.preferredDifficulty || 'mixed');
          setTargetCompaniesInput((prefs.targetCompanies || []).join(', '));
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load preferences.');
      } finally {
        setLoading(false);
      }
    };
    fetchPreferences();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    // Parse target companies array
    const targetCompanies = targetCompaniesInput
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    // Validate no duplicates and max limits
    const normalized = targetCompanies.map((s) => s.toLowerCase());
    if (new Set(normalized).size !== targetCompanies.length) {
      setError('Target companies must be unique.');
      setSaving(false);
      return;
    }
    if (targetCompanies.length > 20) {
      setError('You can add up to 20 target companies.');
      setSaving(false);
      return;
    }

    try {
      const updated = await updateLearningPreferences({
        preferredLanguage,
        currentLevel,
        dailyPracticeGoal: parseInt(dailyPracticeGoal),
        explanationDepth,
        preferredDifficulty,
        targetCompanies,
      });
      if (updated) {
        setSuccess('Preferences saved successfully!');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save preferences.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <Loader2 className="animate-spin text-primary" size={40} />
        <p>Loading your profile preferences...</p>
      </div>
    );
  }

  return (
    <div className="preferences-page-container">
      <div className="preferences-header">
        <BookOpen className="text-primary" size={28} />
        <div>
          <h1 className="text-2xl font-bold">Learning Preferences</h1>
          <p className="text-secondary text-sm">
            Personalize your DSA learning roadmap, AI recommendations, and explanation style.
          </p>
        </div>
      </div>

      <div className="preferences-form-card">
        {error && (
          <div className="alert alert-error">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="alert alert-success">
            <CheckCircle2 size={18} />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="preferences-form">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="preferredLanguage">Preferred Coding Language</label>
              <select
                id="preferredLanguage"
                value={preferredLanguage}
                onChange={(e) => setPreferredLanguage(e.target.value)}
              >
                <option value="cpp">C++ (STL)</option>
                <option value="java">Java</option>
                <option value="python">Python</option>
                <option value="javascript">JavaScript</option>
              </select>
              <span className="help-text">Used to preselect language for new analysis requests.</span>
            </div>

            <div className="form-group">
              <label htmlFor="currentLevel">Current DSA Difficulty Level</label>
              <select
                id="currentLevel"
                value={currentLevel}
                onChange={(e) => setCurrentLevel(e.target.value)}
              >
                <option value="beginner">Beginner (Foundational topics / Easy)</option>
                <option value="intermediate">Intermediate (Arrays, Trees, Graphs / Medium)</option>
                <option value="advanced">Advanced (Hard / Optimization & DP)</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="dailyPracticeGoal">Daily Practice Goal</label>
              <div className="slider-container">
                <input
                  type="range"
                  id="dailyPracticeGoal"
                  min="1"
                  max="20"
                  value={dailyPracticeGoal}
                  onChange={(e) => setDailyPracticeGoal(e.target.value)}
                />
                <span className="slider-value">{dailyPracticeGoal} {dailyPracticeGoal == 1 ? 'problem' : 'problems'} per day</span>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="preferredDifficulty">Preferred Problem Difficulty</label>
              <select
                id="preferredDifficulty"
                value={preferredDifficulty}
                onChange={(e) => setPreferredDifficulty(e.target.value)}
              >
                <option value="mixed">Mixed (Recommended)</option>
                <option value="easy">Easy Only</option>
                <option value="medium">Medium Only</option>
                <option value="hard">Hard Only</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="explanationDepth">Explanation Detail Depth</label>
              <select
                id="explanationDepth"
                value={explanationDepth}
                onChange={(e) => setExplanationDepth(e.target.value)}
              >
                <option value="concise">Concise (Direct summaries & formulas)</option>
                <option value="balanced">Balanced (Optimal explanations & walkthroughs)</option>
                <option value="detailed">Detailed (Highly descriptive breakdown with hints)</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="targetCompanies">Target Companies</label>
              <input
                type="text"
                id="targetCompanies"
                value={targetCompaniesInput}
                onChange={(e) => setTargetCompaniesInput(e.target.value)}
                placeholder="Google, Meta, Amazon, Netflix"
              />
              <span className="help-text">Comma-separated list of companies you are preparing for.</span>
            </div>
          </div>

          <div className="form-actions">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save size={16} />
                  <span>Save Preferences</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LearningPreferencesPage;
export { LearningPreferencesPage };
