import type { ApiErrorCode, ClientErrorCode, FieldError } from './types';

const UNKNOWN_MESSAGE = '请求失败，请稍后重试';

/** 业务/网络错误，统一以 ApiError 抛出。 */
export class ApiError extends Error {
  readonly code: ClientErrorCode;
  readonly details: FieldError[] | null;

  constructor(code: ClientErrorCode, message: string, details: FieldError[] | null = null) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.details = details;
  }
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  return new ApiError('INTERNAL_ERROR', UNKNOWN_MESSAGE);
}

const KNOWN_ERROR_CODES: readonly string[] = [
  'VALIDATION_ERROR',
  'TASK_NOT_FOUND',
  'INVALID_JSON',
  'INTERNAL_ERROR',
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isFieldError(value: unknown): value is FieldError {
  return isRecord(value) && typeof value['path'] === 'string' && typeof value['message'] === 'string';
}

function coerceDetails(value: unknown): FieldError[] | null {
  if (!Array.isArray(value)) return null;
  const details = value.filter(isFieldError).map((item) => ({ path: item.path, message: item.message }));
  return details.length > 0 ? details : null;
}

function errorFromEnvelope(error: unknown): ApiError {
  if (!isRecord(error)) return new ApiError('INTERNAL_ERROR', UNKNOWN_MESSAGE);
  const rawCode = typeof error['code'] === 'string' ? error['code'] : '';
  const code: ApiErrorCode = (KNOWN_ERROR_CODES as readonly string[]).includes(rawCode)
    ? (rawCode as ApiErrorCode)
    : 'INTERNAL_ERROR';
  const message =
    typeof error['message'] === 'string' && error['message'] !== '' ? error['message'] : UNKNOWN_MESSAGE;
  return new ApiError(code, message, coerceDetails(error['details']));
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
}

/**
 * 请求统一响应包装：
 * 成功返回载荷内的 data（T），失败抛出带 code/message/details 的 ApiError；
 * 204 无响应体时返回 undefined。
 */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body } = options;

  let response: Response;
  try {
    response = await fetch(path, {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError('NETWORK_ERROR', '网络请求失败，请确认服务已启动后重试');
  }

  if (response.status === 204) return undefined as T;

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new ApiError('INTERNAL_ERROR', '服务返回了无法解析的响应');
  }

  if (isRecord(payload)) {
    if (isRecord(payload['error'])) throw errorFromEnvelope(payload['error']);
    if ('data' in payload) return payload['data'] as T;
  }

  throw new ApiError('INTERNAL_ERROR', UNKNOWN_MESSAGE);
}
