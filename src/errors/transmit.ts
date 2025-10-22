import { BaseError } from './base';
import type { Maybe, Nullable } from '../utils/utility';

export class TransmitError extends BaseError {
  constructor(
    code: Nullable<string>,
    message?: Maybe<string>,
    previous?: Error,
  ) {
    super(code, message, previous);

    this.name = 'TransmitError';
  }
}
