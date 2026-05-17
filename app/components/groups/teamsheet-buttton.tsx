import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { DownloadIcon } from "lucide-react";
import { Player } from "~/types";
import React from "react";
import { Button } from "../ui/button";
import { calculateAgeGroup } from "~/utils/helpers";
import { POSITION_GROUPS } from "~/utils/position-groups";

async function fetchPlayerImage(
  pdfDoc: PDFDocument,
  url: string | undefined,
  renderSize: number,
) {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    const bitmap = await createImageBitmap(blob);

    const canvas = document.createElement("canvas");
    canvas.width = renderSize;
    canvas.height = renderSize;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // Circular clip mask
    ctx.beginPath();
    ctx.arc(renderSize / 2, renderSize / 2, renderSize / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    // Center-crop source image to a square so it isn't stretched
    const minDim = Math.min(bitmap.width, bitmap.height);
    const sx = (bitmap.width - minDim) / 2;
    const sy = (bitmap.height - minDim) / 2;
    ctx.drawImage(bitmap, sx, sy, minDim, minDim, 0, 0, renderSize, renderSize);

    const pngBytes = await new Promise<Uint8Array | null>((resolve) => {
      canvas.toBlob(async (b) => {
        if (!b) return resolve(null);
        resolve(new Uint8Array(await b.arrayBuffer()));
      }, "image/png");
    });

    if (!pngBytes) return null;
    return await pdfDoc.embedPng(pngBytes);
  } catch {
    return null;
  }
}

export async function generateTeamPDF(players: Player[], teamName: string) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4 size in points
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const { width, height } = page.getSize();

  const logoBytes = await fetch("/logo.png")
    .then((res) => res.arrayBuffer())
    .then((buf) => new Uint8Array(buf));

  const logoImage = await pdfDoc.embedPng(logoBytes);

  // Saints theme colors
  const saintsRed = rgb(0.78, 0.1, 0.15);
  const white = rgb(1, 1, 1);

  // Header band (red, with title + logo)
  const headerHeight = 56;
  page.drawRectangle({
    x: 0,
    y: height - headerHeight,
    width,
    height: headerHeight,
    color: saintsRed,
  });

  // Logo inside header (right-aligned, sized to fit header)
  const logoTargetHeight = headerHeight - 16;
  const logoScale = logoTargetHeight / logoImage.height;
  const logoW = logoImage.width * logoScale;
  const logoH = logoImage.height * logoScale;
  page.drawImage(logoImage, {
    x: width - logoW - 24,
    y: height - headerHeight + (headerHeight - logoH) / 2,
    width: logoW,
    height: logoH,
  });

  // Title inside header
  page.drawText(`TEAM SHEET - ${teamName}`.toUpperCase(), {
    x: 24,
    y: height - headerHeight / 2 - 5,
    size: 16,
    font: fontBold,
    color: white,
  });

  // Footer band (red)
  const footerHeight = 22;
  page.drawRectangle({
    x: 0,
    y: 0,
    width,
    height: footerHeight,
    color: saintsRed,
  });

  // Group players by POSITION_GROUPS
  const groupedSections: { label: string; players: Player[] }[] = [];
  for (const pg of POSITION_GROUPS) {
    const inGroup = players.filter(
      (p) => p?.position && pg.positions.includes(p.position),
    );
    if (inGroup.length > 0) {
      groupedSections.push({ label: pg.label, players: inGroup });
    }
  }
  const known = new Set(POSITION_GROUPS.flatMap((g) => g.positions));
  const others = players.filter(
    (p) => !p?.position || !known.has(p.position),
  );
  if (others.length > 0) {
    groupedSections.push({ label: "Other", players: others });
  }

  // Fetch, center-crop and circular-mask all player photos in parallel.
  // Render at ~5x card-photo display size (40pt ~ 167px @ 300dpi) so print
  // quality stays sharp on the larger card avatars.
  const photoRenderPx = 192;
  const photoEntries = await Promise.all(
    players.map(
      async (p) =>
        [p.id, await fetchPlayerImage(pdfDoc, p.photoUrl, photoRenderPx)] as const,
    ),
  );
  const photoById = new Map(photoEntries);

  // Content starts below the red header band — generous top gap so the first
  // section heading isn't pressed against the red band
  let y = height - headerHeight - 22;

  const marginX = 40;
  const gridWidth = 520;

  // Card grid layout — 3 cards per row per position group section
  const cardCols = 3;
  const cardHGap = 8;
  const cardWidth = (gridWidth - cardHGap * (cardCols - 1)) / cardCols;
  const cardHeight = 50;
  const cardVGap = 6;
  const cardPhotoSize = 40;
  // Header text baseline -> first-card top distance (covers underline + clearance)
  const sectionHeaderHeight = 16;
  // Space below the last card of a group before the next group's header text.
  // Heading cap height is ~8pt, so 20pt leaves ~12pt of visible clear space.
  const sectionGap = 20;

  const truncate = (
    text: string,
    maxWidth: number,
    fnt: typeof font,
    size: number,
  ) => {
    if (!text) return "";
    if (fnt.widthOfTextAtSize(text, size) <= maxWidth) return text;
    const ellipsis = "…";
    let t = text;
    while (
      t.length > 1 &&
      fnt.widthOfTextAtSize(t + ellipsis, size) > maxWidth
    ) {
      t = t.slice(0, -1);
    }
    return t + ellipsis;
  };

  const drawPlayerCard = (player: Player, cardX: number, cardTop: number) => {
    const cardBottom = cardTop - cardHeight;

    // Card surface
    page.drawRectangle({
      x: cardX,
      y: cardBottom,
      width: cardWidth,
      height: cardHeight,
      color: rgb(0.97, 0.97, 0.97),
      borderColor: rgb(0.82, 0.82, 0.82),
      borderWidth: 0.5,
    });

    // Photo (circular, left, vertically centered within card)
    const photo = photoById.get(player.id);
    const photoX = cardX + 5;
    const photoY = cardBottom + (cardHeight - cardPhotoSize) / 2;
    if (photo) {
      page.drawImage(photo, {
        x: photoX,
        y: photoY,
        width: cardPhotoSize,
        height: cardPhotoSize,
      });
    }

    // Shirt # write-in box (top-right of card)
    const shirtSize = 16;
    const shirtX = cardX + cardWidth - 5 - shirtSize;
    const shirtY = cardTop - 5 - shirtSize;
    page.drawRectangle({
      x: shirtX,
      y: shirtY,
      width: shirtSize,
      height: shirtSize,
      borderColor: rgb(0.55, 0.55, 0.55),
      borderWidth: 0.5,
    });
    page.drawText("#", {
      x: shirtX + 2,
      y: shirtY + 2,
      size: 5,
      font,
      color: rgb(0.55, 0.55, 0.55),
    });

    // Info column (right of photo, left of shirt box)
    const infoX = cardX + 5 + cardPhotoSize + 6;
    const infoMaxWidth = shirtX - infoX - 4;

    // Name (bold)
    page.drawText(truncate(player.name, infoMaxWidth, fontBold, 10), {
      x: infoX,
      y: cardTop - 13,
      size: 10,
      font: fontBold,
      color: rgb(0, 0, 0),
    });

    // Position (muted)
    page.drawText(
      truncate(player.position ?? "", infoMaxWidth, font, 8),
      {
        x: infoX,
        y: cardTop - 24,
        size: 8,
        font,
        color: rgb(0.35, 0.35, 0.35),
      },
    );

    // Club (muted)
    if (player.club) {
      page.drawText(truncate(player.club, infoMaxWidth, font, 8), {
        x: infoX,
        y: cardTop - 34,
        size: 8,
        font,
        color: rgb(0.35, 0.35, 0.35),
      });
    }

    // Age group badge (red pill, white text)
    const ag = calculateAgeGroup(player.dateOfBirth);
    if (ag) {
      const badgeFontSize = 7;
      const badgeTextWidth = fontBold.widthOfTextAtSize(ag, badgeFontSize);
      const badgeWidth = badgeTextWidth + 8;
      const badgeHeight = 10;
      page.drawRectangle({
        x: infoX,
        y: cardBottom + 4,
        width: badgeWidth,
        height: badgeHeight,
        color: saintsRed,
      });
      page.drawText(ag, {
        x: infoX + 4,
        y: cardBottom + 7,
        size: badgeFontSize,
        font: fontBold,
        color: white,
      });
    }
  };

  // Draw each position group section
  for (const section of groupedSections) {
    // Section header (red)
    page.drawText(`${section.label} (${section.players.length})`, {
      x: marginX,
      y,
      size: 11,
      font: fontBold,
      color: saintsRed,
    });
    page.drawLine({
      start: { x: marginX, y: y - 4 },
      end: { x: marginX + gridWidth, y: y - 4 },
      thickness: 1,
      color: saintsRed,
    });
    y -= sectionHeaderHeight;

    // Grid of cards for this section
    const numRows = Math.ceil(section.players.length / cardCols);
    for (let i = 0; i < section.players.length; i++) {
      const col = i % cardCols;
      const row = Math.floor(i / cardCols);
      const cardX = marginX + col * (cardWidth + cardHGap);
      const cardTop = y - row * (cardHeight + cardVGap);
      drawPlayerCard(section.players[i], cardX, cardTop);
    }

    y -= numRows * cardHeight + (numRows - 1) * cardVGap;
    y -= sectionGap;
  }

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes], { type: "application/pdf" });

  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "teamsheet.pdf";
  link.click();
}

type DownloadButton = {
  players: Player[];
  teamName: string;
};

export const DownloadButton: React.FC<DownloadButton> = ({
  players,
  teamName,
}) => {
  return (
    <Button
      variant="outline"
      className="w-full"
      onClick={() => generateTeamPDF(players, teamName)}
    >
      <DownloadIcon />
      <span>Download PDF</span>
    </Button>
  );
};
