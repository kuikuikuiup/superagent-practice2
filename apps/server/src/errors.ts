import type { FieldError } from './types.js'

export class ApiError extends Error {
  readonly statusCode: number
  readonly code: string
  readonly details: FieldError[] | null

  constructor(
    statusCode: number,
    code: string,
    message: string,
    details: FieldError[] | null = null
  ) {
    super(message)
    this.name = 'ApiError'
    this.statusCode = statusCode
    this.code = code
    this.details = details
  }
}

export const validationError = (message: string, details: FieldError[]): ApiError =>
  new ApiError(400, 'VALIDATION_ERROR', message, details)

export const notFoundError = (message: string): ApiError =>
  new ApiError(404, 'TASK_NOT_FOUND', message)

export const internalError = (message: string): ApiError =>
  new ApiError(500, 'INTERNAL_ERROR', message)
