/** apiRequest throws "409: {json}" — the server's message, to show to the user. */
export function errorMessage(error: unknown) {
  const raw = error instanceof Error ? error.message : String(error);
  const body = raw.replace(/^\d{3}:\s*/, "");
  try {
    return JSON.parse(body).message ?? body;
  } catch {
    return body;
  }
}
