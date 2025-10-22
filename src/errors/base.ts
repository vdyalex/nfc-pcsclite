import type { Maybe, Nullable } from '../utils/utility';

export class BaseError extends Error {
  public previous?: Error;

  constructor(
    public code: Nullable<string>,
    message?: Maybe<string>,
    previous?: Error,
  ) {
    super(message!);

    Error.captureStackTrace(this, this.constructor);

    this.name = 'BaseError';

    if (!message && previous) {
      this.message = previous.message;
    }

    if (previous) {
      this.previous = previous;
    }
  }
}
