/**
 * Kit sizes and the order they're counted in.
 *
 * The canonical list lives here rather than beside the form that happens to
 * render it, because an order summary has to sort by size and an alphabetical
 * sort puts LG before M before SM — which reads as nonsense on a form going to
 * a supplier.
 */
export const KIT_SIZES = ["XS", "SM", "M", "LG", "XL", "XXL", "XXXL"] as const;

export type KitSize = (typeof KIT_SIZES)[number];

/**
 * Shown for a player with no size recorded.
 *
 * Deliberately counted rather than skipped: a summary that quietly ignores them
 * adds up to fewer shirts than there are players, and the coach only finds out
 * when the box arrives short.
 */
export const NOT_SET = "Not set";

export type KitGarment = {
  /** Column on the player record. */
  field: "shirt" | "shorts";
  /** Heading used in the export. */
  label: string;
};

export const KIT_GARMENTS: KitGarment[] = [
  { field: "shirt", label: "Shirts" },
  { field: "shorts", label: "Shorts" },
];

const sizeRank = (size: string) => {
  const index = KIT_SIZES.indexOf(size as KitSize);
  // Anything unrecognised — including NOT_SET, and any legacy value written
  // before the size list settled — sorts after the real sizes rather than
  // being dropped.
  return index === -1 ? KIT_SIZES.length : index;
};

const sizeOf = (player: any, field: KitGarment["field"]): string => {
  const value = (player?.[field] ?? "").toString().trim();
  return value || NOT_SET;
};

export type KitSummaryRow = {
  garment: string;
  size: string;
  quantity: number;
};

/**
 * How many of each size to order, per garment.
 *
 * Only sizes that someone actually needs appear — a row of zeros is noise on an
 * order form.
 */
export const kitSummary = (players: any[]): KitSummaryRow[] => {
  const rows: KitSummaryRow[] = [];

  for (const garment of KIT_GARMENTS) {
    const counts = new Map<string, number>();
    for (const player of players) {
      const size = sizeOf(player, garment.field);
      counts.set(size, (counts.get(size) || 0) + 1);
    }

    const sorted = [...counts.entries()].sort(
      ([a], [b]) => sizeRank(a) - sizeRank(b) || a.localeCompare(b),
    );

    for (const [size, quantity] of sorted) {
      rows.push({ garment: garment.label, size, quantity });
    }
  }

  return rows;
};

/** One row per player, in the order the export lists them. */
export const kitLines = (players: any[]) =>
  players.map((player) => ({
    name: player?.name ?? "",
    position: player?.position ?? "",
    shirt: sizeOf(player, "shirt"),
    shorts: sizeOf(player, "shorts"),
  }));

/** Players still missing at least one size — worth chasing before ordering. */
export const missingKitSizes = (players: any[]) =>
  players.filter(
    (player) =>
      sizeOf(player, "shirt") === NOT_SET ||
      sizeOf(player, "shorts") === NOT_SET,
  );
