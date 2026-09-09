export type PositionGroup = { label: string; positions: string[] };

export const POSITION_GROUPS: PositionGroup[] = [
  { label: "Outside Backs", positions: ["Winger", "Centre", "Fullback"] },
  { label: "Half Backs", positions: ["Scrum-half", "Stand-off"] },
  { label: "Hookers", positions: ["Hooker"] },
  { label: "Middles", positions: ["Prop"] },
  { label: "Loose Forward", positions: ["Loose Forward"] },
  { label: "Back Row", positions: ["Second Row"] },
];

export const KNOWN_POSITIONS = new Set(
  POSITION_GROUPS.flatMap((g) => g.positions),
);

export const findPositionGroup = (
  position: string | null | undefined,
): PositionGroup | undefined => {
  if (!position) return undefined;
  return POSITION_GROUPS.find((g) => g.positions.includes(position));
};
