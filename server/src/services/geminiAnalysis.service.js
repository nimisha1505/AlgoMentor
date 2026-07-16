import { getGeminiClient, getGeminiModelName, getGeminiFastModelName, getGeminiDeepModelName } from '../config/gemini.js';
import { buildAnalysisPrompt } from './analysisPrompt.service.js';
import {
  buildRequestedAnalysisJsonSchema,
  parseAnalysisResult,
} from '../validators/analysisResult.validator.js';

/**
 * Helper to infer the logical learning mode based on requested sections.
 * This determines model selection and token limits without needing frontend schema changes.
 */
const inferMode = (requestedSections) => {
  if (requestedSections.includes('hints') && !requestedSections.includes('problemExplanation')) return 'start';
  if (requestedSections.includes('problemExplanation') && requestedSections.length <= 5) return 'understand';
  if (requestedSections.includes('comparison') && !requestedSections.includes('userCodeReview')) return 'build';
  if (requestedSections.includes('userCodeReview') && !requestedSections.includes('hints')) return 'review';
  return 'complete';
};

/**
 * Interface with the Google Gemini Gen AI API to retrieve structured analysis results.
 * Builds prompts, dynamically enforces JSON schema matching the requested sections,
 * calls the models API, validates the structure, and returns results along with usage stats.
 */
const generateProblemAnalysis = async ({ inputSnapshot, requestedSections, analysisDepth }) => {
  const mode = inferMode(requestedSections);
  
  // 1. Build mentor prompt
  const prompt = buildAnalysisPrompt({ inputSnapshot, requestedSections, analysisDepth, mode });

  // 2. Build JSON Schema specific to requested sections
  const responseJsonSchema = buildRequestedAnalysisJsonSchema(requestedSections);

  // 3. Acquire API client and target model details
  const client = getGeminiClient();
  
  let modelName = getGeminiModelName();
  let maxTokens = 8192;

  if (mode === 'understand' || mode === 'start') {
    modelName = getGeminiFastModelName();
    maxTokens = 1024; // Small token limit for concise answers
  } else if (mode === 'build' || mode === 'review') {
    modelName = getGeminiDeepModelName();
    maxTokens = 3072; // Medium token limit
  } else {
    modelName = getGeminiDeepModelName();
    maxTokens = 8192; // Large token limit for full lesson
  }

  // 4. Generate structured content
  const response = await client.models.generateContent({
    model: modelName,
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseJsonSchema,
      temperature: 0.2,
      maxOutputTokens: maxTokens,
    },
  });

  const rawText = response.text;

  // 5. Ensure non-empty response
  if (!rawText || rawText.trim() === '') {
    throw new Error('Gemini returned an empty response');
  }

  // 6. Validate result structural compliance
  const result = parseAnalysisResult({
    rawResult: rawText,
    requestedSections,
  });

  // 7. Defensively extract usage metadata (defaulting missing fields to zero)
  const usageMetadata = response.usageMetadata || {};
  const inputTokens = usageMetadata.promptTokenCount || 0;
  const outputTokens = usageMetadata.candidatesTokenCount || 0;
  const totalTokens = usageMetadata.totalTokenCount || 0;

  return {
    result,
    modelName,
    usage: {
      inputTokens,
      outputTokens,
      totalTokens,
    },
  };
};

export { generateProblemAnalysis };
