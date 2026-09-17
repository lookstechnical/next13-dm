export type BibColor = { id: string; name: string; bg: string; fg: string };

/**
 * Bib colours a club is likely to own, with the text colour that stays legible
 * on each. Both are carried as hex rather than Tailwind classes because the
 * printed register sets them as inline custom properties — see its PRINT_CSS.
 */
export const BIB_COLORS: BibColor[] = [
  { id: "red", name: "Red", bg: "#dc2626", fg: "#ffffff" },
  { id: "blue", name: "Blue", bg: "#2563eb", fg: "#ffffff" },
  { id: "yellow", name: "Yellow", bg: "#facc15", fg: "#111827" },
  { id: "green", name: "Green", bg: "#16a34a", fg: "#ffffff" },
  { id: "orange", name: "Orange", bg: "#ea580c", fg: "#ffffff" },
  { id: "purple", name: "Purple", bg: "#7c3aed", fg: "#ffffff" },
  { id: "pink", name: "Pink", bg: "#db2777", fg: "#ffffff" },
  { id: "black", name: "Black", bg: "#111827", fg: "#ffffff" },
  { id: "white", name: "White", bg: "#f9fafb", fg: "#111827" },
];

export const isBibColorId = (id: string | null | undefined): id is string =>
  !!id && BIB_COLORS.some((c) => c.id === id);

export const colorById = (id: string) =>
  BIB_COLORS.find((c) => c.id === id) ?? BIB_COLORS[0];

/**
 * What a club's bib set of one colour holds: the numbers it has lost, and the
 * number it stops at. An absent `highest` means nobody has counted the bag, so
 * the set is treated as bottomless. A `highest` of 0 means the club has no bibs
 * in that colour at all.
 */
export type BibSet = { missing?: number[]; highest?: number };

/**
 * A team's bib sets, from the two columns on its row (see the
 * 20260826_team_*_bib_numbers migrations). The row arrives as Postgres stores
 * it, snake_case. Colours with nothing recorded are left out, so "absent" reads
 * as "complete and uncounted".
 */
export const bibSetsFromTeam = (
  team: {
    missing_bib_numbers?: Record<string, number[]>;
    highest_bib_numbers?: Record<string, number>;
  } | null,
): Record<string, BibSet> => {
  const sets: Record<string, BibSet> = {};
  for (const color of BIB_COLORS) {
    const missing = team?.missing_bib_numbers?.[color.id] ?? [];
    const highest = team?.highest_bib_numbers?.[color.id];
    if (missing.length > 0 || highest !== undefined) {
      sets[color.id] = { missing, highest };
    }
  }
  return sets;
};

/**
 * The lowest bib of a colour still in the bag: not lost, not already worn by
 * someone else, and within the set. Null when the set is spent or the club
 * doesn't own that colour.
 */
export const nextFreeBib = (
  set: BibSet | undefined,
  taken: Set<number>,
): number | null => {
  const { highest, missing = [] } = set ?? {};
  if (highest === 0) return null;
  let n = 1;
  while (missing.includes(n) || taken.has(n)) n += 1;
  return highest !== undefined && n > highest ? null : n;
};

/** Shown in emails for a player who hasn't been handed a bib yet. */
export const BIB_NOT_ASSIGNED = "TBC";

/**
 * A player's bib for an email's {{bib}} variable: "Red 7" drawn as a chip in
 * the bib's colour, so it reads at a glance on a phone at the side of a pitch.
 * Inline styles only — email clients drop stylesheets. A colour or a number on
 * its own still shows what's known; neither gives "TBC".
 */
export const bibEmailHtml = (
  color: string | null | undefined,
  number: number | null | undefined,
) => {
  const swatch = isBibColorId(color) ? colorById(color) : null;
  const label = [swatch?.name, number || ""].filter(Boolean).join(" ");
  if (!label) return BIB_NOT_ASSIGNED;
  if (!swatch) return `<strong>${label}</strong>`;
  return `<span style="display: inline-block; background-color: ${swatch.bg}; color: ${swatch.fg}; border: 1px solid #2a2d3b; border-radius: 4px; padding: 1px 8px; font-weight: bold;">${label}</span>`;
};
