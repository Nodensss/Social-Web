export class CoreError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "CoreError";
    this.status = status;
    this.code = code;
  }
}

export function isCoreError(error: unknown): error is CoreError {
  return error instanceof CoreError;
}

export const unauthorized = () => new CoreError(401, "unauthorized", "Нужно войти в ToyVerse.");

export const forbidden = (message = "Эта игрушка не принадлежит вашей семье.") =>
  new CoreError(403, "forbidden", message);

export const notFound = (message = "Ничего не найдено.") =>
  new CoreError(404, "not_found", message);

export const badRequest = (message: string) => new CoreError(400, "bad_request", message);
