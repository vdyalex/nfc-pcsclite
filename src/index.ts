import pcsc from 'lib:pcsclite';

export default pcsc;

export { default as NFC } from './NFC';
export { default as Reader, KEY_TYPE_A, KEY_TYPE_B } from './reader/Reader';
export { default as ACR122Reader } from './reader/ACR122Reader';

export { Card } from './Card';
export { Connection } from './Connection';

export { TAG_ISO_14443_3, TAG_ISO_14443_4 } from './utils/standard';
export { CONNECT_MODE_CARD, CONNECT_MODE_DIRECT } from './utils/mode';

export {
  FAILURE,
  INVALID_MODE,
  INVALID_KEY,
  INVALID_KEY_NUMBER,
  INVALID_DATA_LENGTH,
  UNABLE_TO_LOAD_KEY,
  NOT_CONNECTED,
  CARD_NOT_CONNECTED,
  OPERATION_FAILED,
  UNKNOWN_ERROR,
  BaseError,
  TransmitError,
  ControlError,
  ReadError,
  WriteError,
  LoadAuthenticationKeyError,
  AuthenticationError,
  ConnectError,
  DisconnectError,
  GetUIDError,
} from './errors';
