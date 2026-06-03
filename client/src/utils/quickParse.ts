interface ParseResult {
  amount: number | null;
  description: string;
  category: string | null;
  tags: string[];
}

/**
 * Parse a quick-input string like "almuerzo 2500 #urgente comida"
 * - First standalone number = amount
 * - Words starting with # = tags
 * - The rest = description
 * - If a known category name is in the text, extract it as category
 */
export function quickParse(input: string, knownCategories: string[]): ParseResult {
  const tokens = input.trim().split(/\s+/);
  let amount: number | null = null;
  const tags: string[] = [];
  const remaining: string[] = [];

  for (const token of tokens) {
    if (token.startsWith('#') && token.length > 1) {
      tags.push(token.slice(1));
      continue;
    }

    // Try to parse as number (handles 1500, 1.500, 1500.50, 1.500,50)
    const cleaned = token.replace(/\./g, '').replace(',', '.');
    const num = Number(cleaned);
    if (amount === null && !isNaN(num) && num > 0) {
      amount = num;
      continue;
    }

    remaining.push(token);
  }

  // Try to find a category match (case-insensitive, fuzzy)
  let category: string | null = null;
  let descriptionTokens = [...remaining];
  const lowerCats = knownCategories.map((c) => c.toLowerCase());

  for (let i = remaining.length - 1; i >= 0; i--) {
    const t = remaining[i].toLowerCase();
    const idx = lowerCats.findIndex((c) => c === t || c.startsWith(t) || t.startsWith(c));
    if (idx !== -1) {
      category = knownCategories[idx];
      descriptionTokens.splice(i, 1);
      break;
    }
  }

  return {
    amount,
    description: descriptionTokens.join(' ').trim(),
    category,
    tags,
  };
}
