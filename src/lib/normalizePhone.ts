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
  // Strip all whitespace, hyphens, parentheses, and other common formatting
  let p = phone.trim().replace(/\s+|-|\(|\)/g, '');
  
  // Track if it had a leading plus sign
  const hasPlus = p.startsWith('+');
  
  // Strip all non-digit characters
  p = p.replace(/\D/g, '');
  
  if (hasPlus) {
    p = '+' + p;
  }

  // 1. Starts with +8801... (e.g. +8801811008303, length 14)
  if (p.startsWith('+8801') && p.length === 14) {
    return p.slice(1); // -> 8801811008303
  }
  
  // 2. Starts with 8801... (e.g. 8801811008303, length 13)
  if (p.startsWith('8801') && p.length === 13) {
    return p; // -> 8801811008303
  }
  
  // 3. Starts with 01... (e.g. 01811008303, typically 11 digits)
  if (p.startsWith('01') && p.length === 11) {
    return '88' + p; // -> 8801811008303
  }

  // If it's invalid (e.g. 10 digits missing leading '0', like '1811008303'), return ""
  return '';
}


