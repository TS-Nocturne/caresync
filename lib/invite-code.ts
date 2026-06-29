export const INVITE_CODE_LENGTH = 8;

export function normalizeInviteCode(value: string) {
  return value.replace(/[^a-z0-9]/gi, "").toUpperCase();
}

export function formatInviteCode(value: string) {
  const normalized = normalizeInviteCode(value);
  if (normalized.length === INVITE_CODE_LENGTH) {
    return `${normalized.slice(0, 4)}-${normalized.slice(4)}`;
  }
  return value;
}

export function formatInviteCodeInput(value: string) {
  const normalized = normalizeInviteCode(value).slice(0, INVITE_CODE_LENGTH);
  if (normalized.length <= 4) return normalized;
  return `${normalized.slice(0, 4)}-${normalized.slice(4)}`;
}

export function isValidInviteCodeInput(value: string) {
  return normalizeInviteCode(value).length >= 6;
}
