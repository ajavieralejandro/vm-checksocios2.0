const REQUEST_TIMEOUT_MS = 15_000;

export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly isNetworkError = false,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

type PostJsonOptions = {
  url: string;
  body: unknown;
  timeoutMs?: number;
};

export async function postJson<T>({
  url,
  body,
  timeoutMs = REQUEST_TIMEOUT_MS,
}: PostJsonOptions): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const rawText = await response.text();
    let parsed: unknown = null;

    if (rawText.length > 0) {
      try {
        parsed = JSON.parse(rawText);
      } catch {
        throw new ApiClientError(
          'El servidor respondió con un formato inválido.',
          response.status,
        );
      }
    }

    if (!response.ok) {
      const backendMessage =
        typeof parsed === 'object' &&
        parsed !== null &&
        'message' in parsed &&
        typeof (parsed as { message: unknown }).message === 'string'
          ? (parsed as { message: string }).message
          : `Error del servidor (${response.status}).`;

      throw new ApiClientError(backendMessage, response.status);
    }

    return parsed as T;
  } catch (error) {
    if (error instanceof ApiClientError) {
      throw error;
    }

    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiClientError(
        'La solicitud tardó demasiado. Verificá tu conexión e intentá de nuevo.',
        undefined,
        true,
      );
    }

    throw new ApiClientError(
      'No se pudo conectar con el servidor. Verificá tu conexión e intentá de nuevo.',
      undefined,
      true,
    );
  } finally {
    clearTimeout(timeoutId);
  }
}
