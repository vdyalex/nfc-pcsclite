import type { EventEmitter } from 'node:events';

import { Maybe } from '../utils';

export type ConnectOptions = {
  share_mode?: number;
  protocol?: number;
};

export type Status = {
  atr?: Buffer;
  state: number;
};

export interface PCSCLite extends EventEmitter {
  on(type: 'error', listener: (error: any) => void): this;
  once(type: 'error', listener: (error: any) => void): this;
  on(type: 'reader', listener: (reader: CardReader) => void): this;
  once(type: 'reader', listener: (reader: CardReader) => void): this;
  close(): void;
  readers: Record<string, CardReader>;
}

type EndListener = (this: CardReader) => void;
type ErrorListener = (this: CardReader, error: any) => void;
type StatusListener = (this: CardReader, status: Status) => void;

type ConnectCallback = (err: Maybe<any>, protocol: number) => void;
type DisconnectCallback = (err: Maybe<any>) => void;
type PayloadCallback = (err: Maybe<any>, response: Buffer) => void;
type StatusCallback = (err: Maybe<any>, state: number, atr?: Buffer) => void;

export interface CardReader extends EventEmitter {
  IOCTL_CCID_ESCAPE: number;

  // Share Mode
  SCARD_SHARE_SHARED: number;
  SCARD_SHARE_EXCLUSIVE: number;
  SCARD_SHARE_DIRECT: number;

  // Protocol
  SCARD_PROTOCOL_T0: number;
  SCARD_PROTOCOL_T1: number;
  SCARD_PROTOCOL_RAW: number;

  // State
  SCARD_STATE_UNAWARE: number;
  SCARD_STATE_IGNORE: number;
  SCARD_STATE_CHANGED: number;
  SCARD_STATE_UNKNOWN: number;
  SCARD_STATE_UNAVAILABLE: number;
  SCARD_STATE_EMPTY: number;
  SCARD_STATE_PRESENT: number;
  SCARD_STATE_ATRMATCH: number;
  SCARD_STATE_EXCLUSIVE: number;
  SCARD_STATE_INUSE: number;
  SCARD_STATE_MUTE: number;

  // Disconnect disposition
  SCARD_LEAVE_CARD: number;
  SCARD_RESET_CARD: number;
  SCARD_UNPOWER_CARD: number;
  SCARD_EJECT_CARD: number;

  name: string;
  state: number;
  connected: boolean;

  on(type: 'error', listener: ErrorListener): this;
  once(type: 'error', listener: ErrorListener): this;

  on(type: 'end', listener: EndListener): this;
  once(type: 'end', listener: EndListener): this;

  on(type: 'status', listener: StatusListener): this;
  once(type: 'status', listener: StatusListener): this;

  SCARD_CTL_CODE(code: number): number;

  get_status(callback: StatusCallback): void;

  connect(callback: ConnectCallback): void;
  connect(options: ConnectOptions, callback: ConnectCallback): void;

  disconnect(callback: DisconnectCallback): void;
  disconnect(disposition: number, callback: DisconnectCallback): void;

  transmit(
    data: Buffer,
    length: number,
    protocol: number,
    callback: PayloadCallback,
  ): void;

  control(
    data: Buffer,
    code: number,
    length: number,
    callback: PayloadCallback,
  ): void;

  close(): void;
}

declare function pcsc(timeout?: number): PCSCLite;

export = pcsc;
