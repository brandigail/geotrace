/** True for characters XML 1.0 forbids outright: control characters other than tab, line feed and carriage return. */
function isIllegal(code: number): boolean {
  return (code < 0x20 && code !== 0x09 && code !== 0x0a && code !== 0x0d) || code === 0xfffe || code === 0xffff
}

function stripIllegal(text: string): string {
  let clean = ''
  for (const char of text) if (!isIllegal(char.codePointAt(0) ?? 0)) clean += char
  return clean
}

/**
 * Makes text safe to put inside an XML element or attribute. Characters that XML 1.0 forbids outright (control
 * characters, which can come from pasted text) are removed, since escaping cannot make them valid, and the five
 * special characters are escaped.
 */
export function xmlEscape(text: string): string {
  return stripIllegal(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')
}

/** A coordinate with six decimals (about 10 cm), never in exponent form. */
export function coordinate(value: number): string {
  return value.toFixed(6)
}

/** A time in the UTC form both GPX and KML want, for example 2026-11-16T14:32:07Z. */
export function isoUtc(ms: number): string {
  return new Date(ms).toISOString().replace(/\.\d{3}Z$/, 'Z')
}
