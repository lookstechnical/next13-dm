/**
 * Parental heights are stored as total inches so they stay comparable, but
 * nobody in the UK says "71 inches" — the form collects feet and inches, and
 * displays them the same way.
 */

const INCHES_PER_FOOT = 12;

/** Matches the CHECK constraint in 20260823_programme_requested_fields.sql. */
export const MIN_HEIGHT_INCHES = 36;
export const MAX_HEIGHT_INCHES = 96;

/**
 * Read the feet and inches boxes, distinguishing "left blank" from "filled in
 * wrongly".
 *
 * The two cases need different handling and collapsing them into a bare null
 * would lose that: a blank pair is fine on an optional field but must be caught
 * on a required one, whereas 9ft is an error either way — silently dropping it
 * would tell the registrant their answer was accepted when it wasn't.
 *
 * A feet value on its own is fine (5ft = 60in). Inches on their own count as a
 * partial entry: "11" alone almost certainly means someone started typing in
 * the wrong box.
 */
export type HeightInput =
  | { status: "empty" }
  | { status: "invalid" }
  | { status: "ok"; inches: number };

const filled = (value?: string | number | null) =>
  value !== "" && value !== null && value !== undefined;

export const parseHeightInput = (
  feet?: string | number | null,
  inches?: string | number | null,
): HeightInput => {
  const hasFeet = filled(feet);
  const hasInches = filled(inches);

  if (!hasFeet && !hasInches) return { status: "empty" };
  // Inches without feet — treat as a partial entry rather than 0ft 11in.
  if (!hasFeet) return { status: "invalid" };

  const ft = Number(feet);
  const inch = hasInches ? Number(inches) : 0;
  if (Number.isNaN(ft) || Number.isNaN(inch)) return { status: "invalid" };
  if (hasInches && (inch < 0 || inch >= INCHES_PER_FOOT)) {
    return { status: "invalid" };
  }

  const total = ft * INCHES_PER_FOOT + inch;
  if (!Number.isFinite(total)) return { status: "invalid" };
  if (total < MIN_HEIGHT_INCHES || total > MAX_HEIGHT_INCHES) {
    return { status: "invalid" };
  }
  return { status: "ok", inches: Math.round(total) };
};

/**
 * Combine a feet and an inches box into total inches, or null if the pair is
 * blank or unusable. Use parseHeightInput when you need to tell those apart.
 */
export const toTotalInches = (
  feet?: string | number | null,
  inches?: string | number | null,
): number | null => {
  const parsed = parseHeightInput(feet, inches);
  return parsed.status === "ok" ? parsed.inches : null;
};

/** Human-readable bound for error copy, e.g. "3ft and 8ft". */
export const HEIGHT_RANGE_LABEL = `${Math.floor(
  MIN_HEIGHT_INCHES / INCHES_PER_FOOT,
)}ft and ${Math.floor(MAX_HEIGHT_INCHES / INCHES_PER_FOOT)}ft`;

/** Split stored inches back into the two form boxes. */
export const fromTotalInches = (
  total?: number | null,
): { feet: string; inches: string } => {
  if (total === null || total === undefined || Number.isNaN(Number(total))) {
    return { feet: "", inches: "" };
  }
  const value = Math.round(Number(total));
  return {
    feet: String(Math.floor(value / INCHES_PER_FOOT)),
    inches: String(value % INCHES_PER_FOOT),
  };
};

/** Display form, e.g. `5ft 11in`. Empty string when not set. */
export const formatHeight = (total?: number | null): string => {
  if (total === null || total === undefined || Number.isNaN(Number(total))) {
    return "";
  }
  const { feet, inches } = fromTotalInches(total);
  return `${feet}ft ${inches}in`;
};
