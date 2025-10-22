import { Standard } from './utils/standard';

export interface Card {
  uid?: string;
  atr?: Buffer;
  standard?: Standard;
  type?: Standard;
}
