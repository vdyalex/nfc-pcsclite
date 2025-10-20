export const CONNECT_MODE_DIRECT = 'CONNECT_MODE_DIRECT';
export const CONNECT_MODE_CARD = 'CONNECT_MODE_CARD';

export const modes = [CONNECT_MODE_DIRECT, CONNECT_MODE_CARD] as const;

export type Mode = (typeof modes)[number];
