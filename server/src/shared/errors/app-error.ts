import { ErrorCode } from "../enums/error-code.enum.js";

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly statusCode: number;

  constructor(message: string, code = ErrorCode.Unknown, statusCode = 400) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
  }
}
