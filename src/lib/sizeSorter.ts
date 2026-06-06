/**
 * Helper to sort size labels from smallest to largest.
 * Handles numeric sizes (e.g. 28, 30, 32) and alphabetical sizes (e.g. XXS, XS, S, M, L, XL, XXL, etc.)
 */
export function sortSizes<T>(sizes: T[], getLabel: (item: T) => string): T[] {
  const getPriority = (label: string): number => {
    const v = label.trim().toUpperCase();
    
    // Handle numeric sizes (e.g., 28, 30, 32, 34)
    const num = Number(v);
    if (!isNaN(num)) {
      return num; // e.g., 28, 30, 32
    }

    // Check standard alphabetic size patterns
    // Map to priorities starting above standard waist sizes (e.g. 1000+)
    const map: Record<string, number> = {
      'XXS': 1000,
      'XS': 1010,
      'S': 1020,
      'M': 1030,
      'L': 1040,
      'XL': 1050,
      'XXL': 1060,
      '2XL': 1060,
      'XXXL': 1070,
      '3XL': 1070,
      'XXXXL': 1080,
      '4XL': 1080,
      'XXXXXL': 1090,
      '5XL': 1090,
    };

    if (map[v] !== undefined) {
      return map[v];
    }

    // If it contains a slash like "M/L", we can place it between the two sizes
    if (v.includes('/')) {
      const parts = v.split('/');
      const p1 = map[parts[0]];
      if (p1 !== undefined) return p1 + 5; // e.g., M/L is between M and L
    }

    // Fallback
    return 2000;
  };

  return [...sizes].sort((a, b) => {
    const lblA = getLabel(a);
    const lblB = getLabel(b);
    const priA = getPriority(lblA);
    const priB = getPriority(lblB);

    if (priA !== priB) {
      return priA - priB;
    }
    return lblA.localeCompare(lblB);
  });
}
