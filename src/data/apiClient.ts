import { assertWritable } from './backendConfig';

const API_BASE_URL = (process.env.IKUYO_API_URL ?? '').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: unknown = undefined,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export type CursorPage<T> = {
  data: T[];
  nextCursor: string | null;
  hasMore: boolean;
};

function url(path: string): string {
  return `${API_BASE_URL}${path}`;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (init.body && !headers.has('Content-Type'))
    headers.set('Content-Type', 'application/json');
  const response = await fetch(url(path), {
    ...init,
    headers,
    credentials: 'include',
  });
  const text = await response.text();
  let body: unknown;
  try {
    body = text ? JSON.parse(text) : undefined;
  } catch {
    body = text;
  }
  if (!response.ok) {
    const message =
      typeof body === 'object' && body !== null && 'message' in body
        ? String(body.message)
        : `API request failed (${response.status})`;
    throw new ApiError(message, response.status, body);
  }
  return body as T;
}

export function get<T>(path: string): Promise<T> {
  return request<T>(path);
}
export function post<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, { method: 'POST', body: JSON.stringify(body) });
}
export function put<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, { method: 'PUT', body: JSON.stringify(body) });
}
export function patch<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, { method: 'PATCH', body: JSON.stringify(body) });
}
export function del<T>(path: string): Promise<T> {
  return request<T>(path, { method: 'DELETE' });
}

export async function mutate<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('X-CSRF-TOKEN', await getCsrfToken());
  try {
    return await request<T>(path, { ...init, headers });
  } catch (error) {
    // A login/session rotation can invalidate the cached token; refresh once.
    if (error instanceof ApiError && error.status === 419) {
      csrfToken = undefined;
      headers.set('X-CSRF-TOKEN', await getCsrfToken());
      return request<T>(path, { ...init, headers });
    }
    throw error;
  }
}

export function postMutation<T>(path: string, body: unknown): Promise<T> {
  assertWritable('this operation');
  return mutate<T>(path, { method: 'POST', body: JSON.stringify(body) });
}

export function putMutation<T>(path: string, body: unknown): Promise<T> {
  assertWritable('this operation');
  return mutate<T>(path, { method: 'PUT', body: JSON.stringify(body) });
}

export function patchMutation<T>(path: string, body: unknown): Promise<T> {
  assertWritable('this operation');
  return mutate<T>(path, { method: 'PATCH', body: JSON.stringify(body) });
}

export function deleteMutation<T>(path: string): Promise<T> {
  assertWritable('this operation');
  return mutate<T>(path, { method: 'DELETE' });
}

let csrfToken: string | undefined;

export async function getCsrfToken(): Promise<string> {
  csrfToken ??= (await get<{ token: string }>('/api/csrf-token')).token;
  return csrfToken;
}

export { request as apiRequest };
