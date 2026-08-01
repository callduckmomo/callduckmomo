/**
 * Utility functions for API provider operations
 */

/**
 * Encode API key to Base64 for Basic Authentication
 */
export function encodeApiKeyToBase64(apiKey: string): string {
  return Buffer.from(apiKey).toString("base64");
}

/**
 * Create Basic Auth header value
 */
export function createBasicAuthHeader(apiKey: string): string {
  const encoded = encodeApiKeyToBase64(apiKey);
  return `Basic ${encoded}`;
}

