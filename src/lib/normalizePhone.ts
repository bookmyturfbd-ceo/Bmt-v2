/**
 * Normalize a Bangladesh phone number to the canonical 8801XXXXXXXXX format (no +, 13 digits).
 * Used consistently across registration, OTP send/verify, and password reset.
 *
 * Accepts:
 *   +8801XXXXXXXXX  → 8801XXXXXXXXX
 *    8801XXXXXXXXX  → 8801XXXXXXXXX
 *      01XXXXXXXXX  → 8801XXXXXXXXX  (prepend 88, NOT 880)
 */
export function normalizePhone(phone: string): string {
  let p = phone.trim();
  if (p.startsWith('+880')) return p.slice(1);       // +880… → 880…
  if (p.startsWith('880'))  return p;                 // already canonical
  if (p.startsWith('01'))   return '88' + p;          // 01… → 8801…  (88 + 01XXXXXXXXX = 13 digits)
  return p; // unknown format — return as-is and let validation catch it
}
