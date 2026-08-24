import { ShirtIcon } from "lucide-react";
import React from "react";
import { Player } from "~/types";
import { formatDate } from "~/utils/helpers";
import { kitLines, kitSummary, missingKitSizes } from "~/utils/kit";
import { Button } from "../ui/button";

const csvCell = (value: string | number) => {
  const s = String(value ?? "");
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const slugify = (value: string) =>
  value
    .trim()
    .replace(/[^\w.-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "group";

/**
 * A kit order as CSV: the totals to give a supplier, then the per-player list
 * to check them against.
 *
 * Summary first because that's the part being ordered from — a supplier
 * shouldn't have to tally 30 rows to find out how many mediums to send. The
 * player list follows so the coach can see who's behind each number and hand
 * the right shirt to the right player once it arrives.
 */
export function generateKitOrderCsv(players: Player[], groupName: string) {
  const summary = kitSummary(players);
  const lines = kitLines(players);
  const missing = missingKitSizes(players);

  const rows: (string | number)[][] = [
    [`Kit Order - ${groupName}`],
    ["Generated", formatDate(new Date().toISOString())],
    ["Players", players.length],
  ];

  if (missing.length > 0) {
    rows.push([
      "Incomplete",
      `${missing.length} player${missing.length === 1 ? "" : "s"} missing a size`,
    ]);
  }

  rows.push([], ["Summary"], ["Item", "Size", "Quantity"]);
  for (const row of summary) {
    rows.push([row.garment, row.size, row.quantity]);
  }

  rows.push([], ["Players"], ["Name", "Position", "Shirt Size", "Shorts Size"]);
  for (const line of lines) {
    rows.push([line.name, line.position, line.shirt, line.shorts]);
  }

  const csv = rows.map((cols) => cols.map(csvCell).join(",")).join("\r\n");

  // Prepend a BOM so Excel reads it as UTF-8.
  const blob = new Blob(["﻿" + csv], {
    type: "text/csv;charset=utf-8;",
  });

  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${slugify(groupName)}-kit-order.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

type KitOrderButton = {
  players: Player[];
  groupName: string;
};

export const KitOrderButton: React.FC<KitOrderButton> = ({
  players,
  groupName,
}) => {
  return (
    <Button
      variant="outline"
      className="w-full"
      disabled={players.length === 0}
      onClick={() => generateKitOrderCsv(players, groupName)}
    >
      <ShirtIcon />
      <span>Export Kit Order</span>
    </Button>
  );
};
