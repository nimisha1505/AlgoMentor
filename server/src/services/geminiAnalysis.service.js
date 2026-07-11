import { getGeminiClient, getGeminiModelName } from '../config/gemini.js';
import { buildAnalysisPrompt } from './analysisPrompt.service.js';
import {
  buildRequestedAnalysisJsonSchema,
  parseAnalysisResult,
} from '../validators/analysisResult.validator.js';

/**
 * Interface with the Google Gemini Gen AI API to retrieve structured analysis results.
 * Builds prompts, dynamically enforces JSON schema matching the requested sections,
 * calls the models API, validates the structure, and returns results along with usage stats.
 */
const generateProblemAnalysis = async ({ inputSnapshot, requestedSections }) => {
  // 1. Build mentor prompt
  const prompt = buildAnalysisPrompt({ inputSnapshot, requestedSections });

  // 2. Build JSON Schema specific to requested sections
  const responseJsonSchema = buildRequestedAnalysisJsonSchema(requestedSections);

  // 3. Acquire API client and target model details
  const client = getGeminiClient();
  const modelName = getGeminiModelName();

  // 4. Generate structured content
  const response = await client.models.generateContent({
    model: modelName,
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseJsonSchema,
      temperature: 0.2,
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
