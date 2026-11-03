/** Error thrown by apiRequest: the server's message, its HTTP status and, when sent, the form field at fault. */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public field?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Builds the ApiError from a failed response body ({message, field?} JSON, plain text or an HTML error page). */
export function apiErrorFrom(status: number, text: string, statusText = "") {
  try {
    const body = JSON.parse(text);
    if (body && typeof body.message === "string") return new ApiError(body.message, status, typeof body.field === "string" ? body.field : undefined);
  } catch {
    // not JSON
  }
  const plain = text.trim();
  if (!plain || plain.startsWith("<")) {
    return new ApiError(status >= 500 ? "O servidor não respondeu como esperado. Tente novamente em instantes." : statusText || `Erro ${status}`, status);
  }
  return new ApiError(plain, status);
}

/** The message to show the user (also accepts the legacy "409: {json}" format). */
export function errorMessage(error: unknown) {
  if (error instanceof ApiError) return error.message;
  const raw = error instanceof Error ? error.message : String(error);
  const body = raw.replace(/^\d{3}:\s*/, "");
  try {
    return JSON.parse(body).message ?? body;
  } catch {
    return body;
  }
}
