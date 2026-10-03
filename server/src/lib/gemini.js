const { HttpError } = require('./errors');

const API_ROOT = 'https://generativelanguage.googleapis.com/v1beta/models';

/**
 * Minimal Gemini REST client. The API key travels in a header (never the URL) and only ever
 * lives on the server.
 */
function createGeminiClient({ apiKey, model, timeoutMs }, fetchImpl = fetch) {
  async function generate({ system, messages, temperature = 0.4, maxOutputTokens = 1024, responseSchema }) {
    const body = {
      systemInstruction: { parts: [{ text: system }] },
      contents: messages.map((message) => ({ role: message.role, parts: [{ text: message.text }] })),
      generationConfig: {
        temperature,
        maxOutputTokens,
        ...(responseSchema ? { responseMimeType: 'application/json', responseSchema } : {}),
      },
    };

    let response;
    try {
      response = await fetchImpl(`${API_ROOT}/${encodeURIComponent(model)}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (error) {
      const timedOut = error && error.name === 'TimeoutError';
      throw new HttpError(timedOut ? 504 : 502, timedOut ? 'ai_timeout' : 'ai_unreachable', timedOut
        ? 'The AI service took too long to respond.'
        : 'The AI service could not be reached.');
    }

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      console.error(`Gemini request failed (${response.status}): ${detail.slice(0, 500)}`);
      if (response.status === 429) throw new HttpError(429, 'ai_quota', 'The AI service is at capacity. Try again shortly.');
      throw new HttpError(502, 'ai_upstream_error', 'The AI service returned an error.');
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];
    const text = candidate?.content?.parts?.map((part) => part.text ?? '').join('').trim();
    if (!text) {
      if (data.promptFeedback?.blockReason || candidate?.finishReason === 'SAFETY') {
        throw new HttpError(422, 'ai_blocked', 'The AI service declined to answer this request.');
      }
      throw new HttpError(502, 'ai_empty', 'The AI service returned an empty response.');
    }
    return text;
  }

  return { model, generate };
}

module.exports = { createGeminiClient };
