import { Player } from "~/types";
import { quartileLabelOf } from "~/utils/helpers";

// Excel needs every field quoted-and-escaped to survive commas in club names
// and quotes in nicknames.
const escapeCell = (value: string) => `"${(value ?? "").replace(/"/g, '""')}"`;

/**
 * One row per player, in the order the list is showing them, so the CSV is a
 * snapshot of whatever filters are applied rather than the whole squad.
 */
export const playersToCsv = (players: Player[]): string => {
  const rows: string[][] = [["Name", "Club", "Position", "Quartile"]];

  for (const player of players) {
    rows.push([
      player.name ?? "",
      player.club ?? "",
      player.position ?? "",
      quartileLabelOf(player.dateOfBirth),
    ]);
  }

  // Excel on Windows only auto-detects UTF-8 with a BOM, and accented names
  // are common enough to matter.
  return "﻿" + rows.map((row) => row.map(escapeCell).join(",")).join("\r\n");
};

const slugify = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "team";

export const downloadPlayersCsv = (players: Player[], teamName: string) => {
  const csv = playersToCsv(players);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });

  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${slugify(teamName)}-players.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
};
