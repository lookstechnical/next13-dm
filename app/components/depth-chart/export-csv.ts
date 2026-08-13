import { DepthChart, Player } from "~/types";

// Excel needs every field quoted-and-escaped to survive commas in club names
// and quotes in nicknames.
const escapeCell = (value: string) => `"${(value ?? "").replace(/"/g, '""')}"`;

/**
 * The chart as a grid: one column per depth chart column, one row per depth
 * rank, so the CSV opens in Excel looking like the board on screen.
 */
export const depthChartToCsv = (
  chart: DepthChart,
  playersById: Map<string, Player>,
): string => {
  const columns = chart.columns ?? [];
  const deepest = columns.reduce(
    (max, column) => Math.max(max, column.slots?.length ?? 0),
    0,
  );

  const rows: string[][] = [];
  rows.push(["Depth", ...columns.map((column) => column.name)]);

  for (let rank = 0; rank < deepest; rank++) {
    rows.push([
      String(rank + 1),
      ...columns.map((column) => {
        const slot = column.slots?.[rank];
        if (!slot) return "";
        return playersById.get(slot.playerId)?.name ?? "Unknown player";
      }),
    ]);
  }

  if (deepest === 0) rows.push(["1", ...columns.map(() => "")]);

  // Excel on Windows only auto-detects UTF-8 with a BOM, and accented names
  // are common enough to matter.
  return "﻿" + rows.map((row) => row.map(escapeCell).join(",")).join("\r\n");
};

const slugify = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "depth-chart";

export const downloadDepthChartCsv = (
  chart: DepthChart,
  playersById: Map<string, Player>,
) => {
  const csv = depthChartToCsv(chart, playersById);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });

  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${slugify(chart.name)}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
};
