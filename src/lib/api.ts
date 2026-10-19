import { AIError } from "./ai/client";

/** Wrap a route handler so thrown errors become JSON `{ error }` responses. */
export function handle<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (err) {
      const status = err instanceof AIError ? err.status : err instanceof HttpError ? err.status : 500;
      const message = err instanceof Error ? err.message : "Unexpected error";
      if (status >= 500) console.error(err);
      return Response.json({ error: message }, { status });
    }
  };
}

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
