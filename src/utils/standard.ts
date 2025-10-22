export const TAG_ISO_14443_3 = 'TAG_ISO_14443_3' as const; // ISO/IEC 14443-3
export const TAG_ISO_14443_4 = 'TAG_ISO_14443_4' as const; // ISO/IEC 14443-4

export const standards = [TAG_ISO_14443_3, TAG_ISO_14443_4] as const;

export type Standard = (typeof standards)[number];
