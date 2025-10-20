export const UNKNOWN_ERROR = 'unknown_error';

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

export const FAILURE = 'failure';
export const INVALID_MODE = 'invalid_mode';
export const INVALID_KEY = 'invalid_key';
export const INVALID_KEY_NUMBER = 'invalid_key_number';
export const INVALID_DATA_LENGTH = 'invalid_data_length';
export const UNABLE_TO_LOAD_KEY = 'unable_to_load_key';
export const NOT_CONNECTED = 'not_connected';
export const CARD_NOT_CONNECTED = 'card_not_connected';
export const OPERATION_FAILED = 'operation_failed';

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

export class ControlError extends BaseError {
  constructor(
    code: Nullable<string>,
    message?: Maybe<string>,
    previous?: Error,
  ) {
    super(code, message, previous);

    this.name = 'ControlError';
  }
}

export class ReadError extends BaseError {
  constructor(
    code: Nullable<string>,
    message?: Maybe<string>,
    previous?: Error,
  ) {
    super(code, message, previous);

    this.name = 'ReadError';
  }
}

export class WriteError extends BaseError {
  constructor(
    code: Nullable<string>,
    message?: Maybe<string>,
    previous?: Error,
  ) {
    super(code, message, previous);

    this.name = 'WriteError';
  }
}

export class LoadAuthenticationKeyError extends BaseError {
  constructor(
    code: Nullable<string>,
    message?: Maybe<string>,
    previous?: Error,
  ) {
    super(code, message, previous);

    this.name = 'LoadAuthenticationKeyError';
  }
}

export class AuthenticationError extends BaseError {
  constructor(
    code: Nullable<string>,
    message?: Maybe<string>,
    previous?: Error,
  ) {
    super(code, message, previous);

    this.name = 'AuthenticationError';
  }
}

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

export class DisconnectError extends BaseError {
  constructor(
    code: Nullable<string>,
    message?: Maybe<string>,
    previous?: Error,
  ) {
    super(code, message, previous);

    this.name = 'DisconnectError';
  }
}

export class GetUIDError extends BaseError {
  constructor(
    code: Nullable<string>,
    message?: Maybe<string>,
    previous?: Error,
  ) {
    super(code, message, previous);

    this.name = 'GetUIDError';
  }
}
