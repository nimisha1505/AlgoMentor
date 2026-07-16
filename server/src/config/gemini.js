import { GoogleGenAI } from '@google/genai';

let geminiClientInstance = null;

/**
 * Lazily creates and returns a cached GoogleGenAI client instance.
 * Throws an error if GEMINI_API_KEY is not configured.
 */
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey.trim() === '') {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  if (!geminiClientInstance) {
    geminiClientInstance = new GoogleGenAI({
      apiKey: apiKey,
    });
  }

  return geminiClientInstance;
};

/**
 * Returns configured Gemini model name from environment or defaults to 'gemini-3.5-flash'.
 * Used for generic fallback.
 */
const getGeminiModelName = () =>
  process.env.GEMINI_MODEL?.trim() || 'gemini-3.5-flash';

/**
 * Returns fast model for simple operations (e.g. Understand, Help Me Start).
 */
const getGeminiFastModelName = () =>
  process.env.GEMINI_FAST_MODEL?.trim() || process.env.GEMINI_MODEL?.trim() || 'gemini-3.5-flash';

/**
 * Returns deeper reasoning model for complex operations (e.g. Build, Review, Complete).
 */
const getGeminiDeepModelName = () =>
  process.env.GEMINI_DEEP_MODEL?.trim() || process.env.GEMINI_MODEL?.trim() || 'gemini-3.5-flash';

export { getGeminiClient, getGeminiModelName, getGeminiFastModelName, getGeminiDeepModelName };
