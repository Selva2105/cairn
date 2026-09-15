export const ROLES = {
  OWNER: 'owner',
  MEMBER: 'member',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];
