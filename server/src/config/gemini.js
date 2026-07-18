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
 * Returns configured Gemini model name from environment or defaults to 'gemini-2.5-flash'.
 * Used for generic fallback.
 */
const getGeminiModelName = () => {
  const model = process.env.GEMINI_MODEL;
  if (!model || model.trim() === '') {
    return 'gemini-2.5-flash';
  }
  return model.trim();
};

/**
 * Returns fast model for simple operations (e.g. Understand, Help Me Start).
 */
const getGeminiFastModelName = () => {
  const model = process.env.GEMINI_FAST_MODEL;
  if (model && model.trim() !== '') {
    return model.trim();
  }
  return getGeminiModelName();
};

const getGeminiDeepModelName = () => {
  const model = process.env.GEMINI_DEEP_MODEL;
  if (model && model.trim() !== '') {
    return model.trim();
  }
  return getGeminiModelName();
};

export { getGeminiClient, getGeminiModelName, getGeminiFastModelName, getGeminiDeepModelName };
