export const matchesParcel = (expected, scanned) =>
  Boolean(expected) && expected === scanned.trim();
