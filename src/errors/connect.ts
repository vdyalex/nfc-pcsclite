import { BaseError } from './base';
import type { Maybe, Nullable } from '../utils/utility';

export class ConnectError extends BaseError {
  constructor(
    code: Nullable<string>,
    message?: Maybe<string>,
    previous?: Error,
  ) {
    super(code, message, previous);

    this.name = 'ConnectError';
  }
}
