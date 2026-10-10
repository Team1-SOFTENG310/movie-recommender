// src/middleware/error.middleware.ts
import type { ErrorRequestHandler, RequestHandler } from "express";
import { HttpError, type ErrorResponse } from "../errors.js";

// Express 4 doesn't catch rejected promises, so forward them to next()
export function asyncHandler<P, ResBody, ReqBody, ReqQuery>(
  fn: (...args: Parameters<RequestHandler<P, ResBody, ReqBody, ReqQuery>>) => Promise<void>,
): RequestHandler<P, ResBody, ReqBody, ReqQuery> {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}

export const notFound: RequestHandler<{}, ErrorResponse> = (_req, res) => {
  res.status(404).json({ message: "Not found" });
};

function isBodyParserError(err: unknown): boolean {
  return err instanceof SyntaxError && "status" in err && err.status === 400;
}

// Express identifies error middleware by its 4 parameters, so _next must stay
export const errorHandler: ErrorRequestHandler = (err: unknown, _req, res, _next) => {
  let status = 500;
  let message = "Internal server error";

  if (err instanceof HttpError) {
    status = err.status;
    message = err.message;
  } else if (isBodyParserError(err)) {
    status = 400;
    message = "Malformed JSON body";
  }

  if (status >= 500) console.error(err);
  res.status(status).json({ message });
};
