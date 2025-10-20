import { Standard } from './standard';

export interface Connection {
  type: number;
  protocol: number;
}

export interface Card {
  uid?: string;
  atr?: Buffer;
  standard?: Standard;
  type?: Standard;
}
