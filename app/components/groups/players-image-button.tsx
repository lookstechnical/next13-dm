import { ImageDownIcon, Loader2 } from "lucide-react";
import React, { useState } from "react";
import { Player } from "~/types";
import { Button } from "../ui/button";

/**
 * Center-cropped square tile for one player. Cropping (rather than scaling to
 * fit) keeps every tile the same size so the grid stays a clean lattice
 * regardless of the aspect ratio each parent happened to upload.
 */
async function drawPlayerTile(
  ctx: CanvasRenderingContext2D,
  player: Player,
  x: number,
  y: number,
  size: number,
) {
  const bitmap = await loadBitmap(player.photoUrl);

  if (!bitmap) {
    drawInitialsTile(ctx, player, x, y, size);
    return;
  }

  const minDim = Math.min(bitmap.width, bitmap.height);
  const sx = (bitmap.width - minDim) / 2;
  const sy = (bitmap.height - minDim) / 2;
  ctx.drawImage(bitmap, sx, sy, minDim, minDim, x, y, size, size);
  bitmap.close?.();
}

/**
 * Fetched as a blob rather than set as an <img> src so the canvas is never
 * tainted by the storage origin and toBlob() still works.
 */
async function loadBitmap(url?: string | null) {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await createImageBitmap(await res.blob());
  } catch {
    return null;
  }
}

/**
 * Players with no photo still get a tile — dropping them would make the sheet
 * quietly incomplete, and a hole in the grid reads as a rendering bug.
 */
function drawInitialsTile(
  ctx: CanvasRenderingContext2D,
  player: Player,
  x: number,
  y: number,
  size: number,
) {
  const initials = (player.name ?? "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  ctx.fillStyle = "#e5e7eb";
  ctx.fillRect(x, y, size, size);

  ctx.fillStyle = "#9ca3af";
  ctx.font = `600 ${Math.round(size * 0.3)}px Helvetica, Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(initials || "?", x + size / 2, y + size / 2);
}

const COLUMNS = 4;
const MAX_TILE = 512;
// iOS Safari refuses to produce a blob from a canvas over ~16.7M pixels, so
// tiles shrink on large squads rather than the export failing outright.
const MAX_CANVAS_PIXELS = 15_000_000;
const GAP = 6;

export async function generatePlayersImage(players: Player[], name: string) {
  if (players.length === 0) return;

  const cols = Math.min(COLUMNS, players.length);
  const rows = Math.ceil(players.length / cols);

  const tile = Math.min(
    MAX_TILE,
    Math.floor(Math.sqrt(MAX_CANVAS_PIXELS / (cols * rows))),
  );

  const canvas = document.createElement("canvas");
  canvas.width = cols * tile + (cols + 1) * GAP;
  canvas.height = rows * tile + (rows + 1) * GAP;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Tiles are drawn in parallel: each one owns a fixed rect, so completion
  // order doesn't affect the result and one slow photo can't stall the rest.
  await Promise.all(
    players.map((player, i) =>
      drawPlayerTile(
        ctx,
        player,
        GAP + (i % cols) * (tile + GAP),
        GAP + Math.floor(i / cols) * (tile + GAP),
        tile,
      ),
    ),
  );

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.9),
  );
  if (!blob) return;

  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${name.trim().replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "players"}-players.jpg`;
  link.click();
  URL.revokeObjectURL(link.href);
}

type PlayersImageButton = {
  players: Player[];
  /** Used for the download filename. */
  groupName: string;
};

export const PlayersImageButton: React.FC<PlayersImageButton> = ({
  players,
  groupName,
}) => {
  // Every photo is fetched over the network, so a squad-sized export takes long
  // enough that an unchanged button reads as a dead click.
  const [busy, setBusy] = useState(false);

  const download = async () => {
    setBusy(true);
    try {
      await generatePlayersImage(players, groupName);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      variant="outline"
      className="w-full"
      disabled={busy || players.length === 0}
      onClick={download}
    >
      {busy ? <Loader2 className="animate-spin" /> : <ImageDownIcon />}
      <span>{busy ? "Building image…" : "Download Photo Grid"}</span>
    </Button>
  );
};
