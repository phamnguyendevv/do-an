export type ServiceErrorCode =
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "CONFLICT"
  | "INSUFFICIENT_STOCK"
  | "INVALID_TRANSITION"
  | "DUPLICATE_OPERATION"
  | "PERSISTENCE_ERROR";

export interface ServiceResult<T> {
  ok: boolean;
  data?: T;
  error?: string;
  code?: ServiceErrorCode;
}

export const serviceSuccess = <T>(data: T): ServiceResult<T> => ({
  ok: true,
  data,
});

export const serviceFailure = <T = never>(
  code: ServiceErrorCode,
  error: string,
): ServiceResult<T> => ({ ok: false, code, error });
