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
  let prompt = buildAnalysisPrompt({ inputSnapshot, requestedSections, analysisDepth, mode });

  if (analysisDepth === 'quick') {
    prompt += `\nStrict length limits for QUICK analysis:
1. Explain elements concisely in very few sentences.
2. Provide a maximum of 3-5 hints.
3. Keep pattern clues concise and brief.
4. Do not include any unrequested approaches, code, complexity, comparison, or interview sections under any circumstances.`;
  }

  // 2. Build JSON Schema specific to requested sections
  const responseJsonSchema = buildRequestedAnalysisJsonSchema(requestedSections, mode === 'complete');

  // 3. Acquire API client and target model details
  const client = getGeminiClient();
  
  let modelName = getGeminiModelName();
  let maxTokens = 8192;

  if (mode === 'understand' || mode === 'start') {
    modelName = getGeminiFastModelName();
    maxTokens = analysisDepth === 'deep' ? 4096 : 2048;
  } else if (mode === 'build' || mode === 'review') {
    modelName = getGeminiDeepModelName();
    maxTokens = analysisDepth === 'deep' ? 8192 : 4096;
  } else {
    modelName = getGeminiDeepModelName();
    maxTokens = analysisDepth === 'deep' ? 8192 : 6144;
  }

  const toUpperTypeSchema = (schema) => {
    if (!schema || typeof schema !== 'object') {
      return schema;
    }
    if (Array.isArray(schema)) {
      return schema.map(toUpperTypeSchema);
    }
    const result = {};
    for (const [key, value] of Object.entries(schema)) {
      if (key === 'type' && typeof value === 'string') {
        result[key] = value.toUpperCase();
      } else if (typeof value === 'object' && value !== null) {
        result[key] = toUpperTypeSchema(value);
      } else {
        result[key] = value;
      }
    }
    return result;
  };

  const responseSchema = toUpperTypeSchema(responseJsonSchema);

  // 4. Generate structured content
  const response = await client.models.generateContent({
    model: modelName,
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema,
      temperature: 0.2,
      maxOutputTokens: maxTokens,
    },
  });

  const candidate = response.candidates?.[0] || {};
  const finishReason = candidate.finishReason;
  const finishMessage = candidate.finishMessage;
  const usageMetadata = response.usageMetadata || {};
  const promptTokenCount = usageMetadata.promptTokenCount || 0;
  const candidatesTokenCount = usageMetadata.candidatesTokenCount || 0;
  const totalTokenCount = usageMetadata.totalTokenCount || 0;

  // Safely read response.text
  let rawText;
  try {
    rawText = response.text;
  } catch (err) {
    console.error('Failed to read text from Gemini response:', err.message);
  }

  const textLength = rawText ? rawText.length : 0;

  console.log(`Gemini response diagnostics:
- finishReason: ${finishReason || 'N/A'}
- finishMessage: ${finishMessage || 'N/A'}
- prompt token count: ${promptTokenCount}
- candidates token count: ${candidatesTokenCount}
- total token count: ${totalTokenCount}
- response text length: ${textLength}`);

  if (finishReason === 'MAX_TOKENS' || (typeof finishReason === 'string' && finishReason.toUpperCase() === 'MAX_TOKENS')) {
    throw new Error('Gemini response was truncated before completion');
  }

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
