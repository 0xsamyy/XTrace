// src/utils/currency.ts
export function decodeCurrencyHex(hex?: string): string | undefined {
  if (!hex) return undefined;
  const clean = hex.replace(/^0x/i, '');
  if (clean.length !== 40) return undefined; // must be 20 bytes
  // strip leading/trailing 0x00 padding
  const bytes = clean.match(/.{2}/g)?.map(b => parseInt(b, 16)) ?? [];
  // Remove leading/trailing zeros
  let start = 0, end = bytes.length;
  while (start < end && bytes[start] === 0) start++;
  while (end > start && bytes[end - 1] === 0) end--;
  const slice = bytes.slice(start, end);
  // Ensure printable ASCII
  if (!slice.every(b => b >= 0x20 && b <= 0x7E)) return undefined;
  return String.fromCharCode(...slice);
}
