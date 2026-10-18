// src/errors.ts
export interface ErrorResponse {
  message: string;
}

export class HttpError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = "HttpError";
  }
}
