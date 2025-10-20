export const TAG_ISO_14443_3 = 'TAG_ISO_14443_3'; // ISO/IEC 14443-3 tags
export const TAG_ISO_14443_4 = 'TAG_ISO_14443_4'; // ISO/IEC 14443-4 tags

export const standards = [TAG_ISO_14443_3, TAG_ISO_14443_4] as const;

export type Standard = (typeof standards)[number];
