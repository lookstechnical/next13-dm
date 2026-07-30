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

export async function generateTeamPDF(
  players: Player[],
  teamName: string,
  options?: {
    /** Players unavailable for the event — listed for info, no card drawn. */
    unavailableIds?: Set<string>;
    eventName?: string;
  },
) {
  const unavailableIds = options?.unavailableIds;
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const logoBytes = await fetch("/logo.png")
    .then((res) => res.arrayBuffer())
    .then((buf) => new Uint8Array(buf));

  const logoImage = await pdfDoc.embedPng(logoBytes);

  // Saints theme colors
  const saintsRed = rgb(0.78, 0.1, 0.15);
  const white = rgb(1, 1, 1);

  const pageWidth = 595.28;
  const pageHeight = 841.89; // A4 size in points
  const headerHeight = 48;
  const footerHeight = 18;
  const marginX = 34;
  const gridWidth = pageWidth - marginX * 2;
  // Lowest y content may occupy before a new page is needed.
  const contentBottom = footerHeight + 14;

  // Unavailable players get a compact name list at the end instead of a card,
  // so the cards on the sheet are only the players actually available.
  const unavailablePlayers = unavailableIds
    ? players
        .filter((p) => unavailableIds.has(p.id))
        .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""))
    : [];
  const availablePlayers = unavailableIds
    ? players.filter((p) => !unavailableIds.has(p.id))
    : players;

  // Group available players by POSITION_GROUPS
  const groupedSections: { label: string; players: Player[] }[] = [];
  for (const pg of POSITION_GROUPS) {
    const inGroup = availablePlayers.filter(
      (p) => p?.position && pg.positions.includes(p.position),
    );
    if (inGroup.length > 0) {
      groupedSections.push({ label: pg.label, players: inGroup });
    }
  }
  const known = new Set(POSITION_GROUPS.flatMap((g) => g.positions));
  const others = availablePlayers.filter(
    (p) => !p?.position || !known.has(p.position),
  );
  if (others.length > 0) {
    groupedSections.push({ label: "Other", players: others });
  }

  // Fetch, center-crop and circular-mask all player photos in parallel.
  // Render at ~5x card-photo display size (30pt ~ 125px @ 300dpi) so print
  // quality stays sharp on the card avatars.
  const photoRenderPx = 160;
  const photoEntries = await Promise.all(
    availablePlayers.map(
      async (p) =>
        [p.id, await fetchPlayerImage(pdfDoc, p.photoUrl, photoRenderPx)] as const,
    ),
  );
  const photoById = new Map(photoEntries);

  const drawPageChrome = (p: ReturnType<typeof pdfDoc.addPage>) => {
    // Header band (red, with title + logo)
    p.drawRectangle({
      x: 0,
      y: pageHeight - headerHeight,
      width: pageWidth,
      height: headerHeight,
      color: saintsRed,
    });

    // Logo inside header (right-aligned, sized to fit header)
    const logoTargetHeight = headerHeight - 14;
    const logoScale = logoTargetHeight / logoImage.height;
    const logoW = logoImage.width * logoScale;
    const logoH = logoImage.height * logoScale;
    p.drawImage(logoImage, {
      x: pageWidth - logoW - 24,
      y: pageHeight - headerHeight + (headerHeight - logoH) / 2,
      width: logoW,
      height: logoH,
    });

    // Title inside header
    p.drawText(`TEAM SHEET - ${teamName}`.toUpperCase(), {
      x: marginX,
      y: pageHeight - headerHeight / 2 - 4,
      size: 14,
      font: fontBold,
      color: white,
    });

    // Footer band (red)
    p.drawRectangle({
      x: 0,
      y: 0,
      width: pageWidth,
      height: footerHeight,
      color: saintsRed,
    });
  };

  // Content starts below the red header band — generous top gap so the first
  // section heading isn't pressed against the red band
  const contentTop = pageHeight - headerHeight - 18;

  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  drawPageChrome(page);
  let y = contentTop;

  // Overflow onto a new page so no player ever falls off the bottom.
  const newPage = () => {
    page = pdfDoc.addPage([pageWidth, pageHeight]);
    drawPageChrome(page);
    y = contentTop;
  };

  // When filtered by an event, note it under the header and point at the
  // unavailable list.
  if (options?.eventName) {
    page.drawText(`Availability for: ${options.eventName}`, {
      x: marginX,
      y,
      size: 8,
      font: fontBold,
      color: rgb(0.2, 0.2, 0.2),
    });
    y -= 10;
    if (unavailablePlayers.length > 0) {
      page.drawText(
        `${unavailablePlayers.length} not registered / unavailable — listed at the end`,
        {
          x: marginX,
          y,
          size: 7,
          font,
          color: rgb(0.5, 0.5, 0.5),
        },
      );
      y -= 10;
    }
    y -= 6;
  }

  // Card grid layout — 4 cards per row per position group section
  const cardCols = 4;
  const cardHGap = 6;
  const cardWidth = (gridWidth - cardHGap * (cardCols - 1)) / cardCols;
  const cardHeight = 42;
  const cardVGap = 5;
  const cardPhotoSize = 30;
  // Header text baseline -> first-card top distance (covers underline + clearance)
  const sectionHeaderHeight = 14;
  // Space below the last card of a group before the next group's header text.
  // Heading cap height is ~7pt, so 17pt leaves ~10pt of visible clear space.
  const sectionGap = 17;

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

  // Cards are narrow at 4-per-row, so shorten a long name by initialising the
  // forename(s) before falling back to a truncated string.
  const fitName = (
    name: string,
    maxWidth: number,
    fnt: typeof font,
    size: number,
  ) => {
    if (!name) return "";
    if (fnt.widthOfTextAtSize(name, size) <= maxWidth) return name;
    const parts = name.trim().split(/\s+/);
    if (parts.length > 1) {
      const abbreviated = `${parts
        .slice(0, -1)
        .map((p) => `${p[0]}.`)
        .join("")} ${parts[parts.length - 1]}`;
      if (fnt.widthOfTextAtSize(abbreviated, size) <= maxWidth)
        return abbreviated;
      return truncate(abbreviated, maxWidth, fnt, size);
    }
    return truncate(name, maxWidth, fnt, size);
  };

  const drawSectionHeader = (label: string, count: number) => {
    // Never leave a heading stranded at the foot of a page.
    if (y - sectionHeaderHeight - cardHeight < contentBottom) newPage();
    page.drawText(`${label} (${count})`, {
      x: marginX,
      y,
      size: 10,
      font: fontBold,
      color: saintsRed,
    });
    page.drawLine({
      start: { x: marginX, y: y - 4 },
      end: { x: marginX + gridWidth, y: y - 4 },
      thickness: 0.8,
      color: saintsRed,
    });
    y -= sectionHeaderHeight;
  };

  const drawPlayerCard = (player: Player, cardX: number, cardTop: number) => {
    const cardBottom = cardTop - cardHeight;
    const nameColor = rgb(0, 0, 0);
    const subColor = rgb(0.35, 0.35, 0.35);

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
    const photoX = cardX + 4;
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
    const shirtSize = 13;
    const shirtX = cardX + cardWidth - 4 - shirtSize;
    const shirtY = cardTop - 4 - shirtSize;
    page.drawRectangle({
      x: shirtX,
      y: shirtY,
      width: shirtSize,
      height: shirtSize,
      borderColor: rgb(0.55, 0.55, 0.55),
      borderWidth: 0.5,
    });
    page.drawText("#", {
      x: shirtX + 1.5,
      y: shirtY + 1.5,
      size: 4.5,
      font,
      color: rgb(0.55, 0.55, 0.55),
    });

    // Info column (right of photo, left of shirt box)
    const infoX = cardX + 4 + cardPhotoSize + 4;
    const infoMaxWidth = shirtX - infoX - 3;

    // Name (bold)
    page.drawText(fitName(player.name, infoMaxWidth, fontBold, 8), {
      x: infoX,
      y: cardTop - 11,
      size: 8,
      font: fontBold,
      color: nameColor,
    });

    // Position (muted)
    page.drawText(truncate(player.position ?? "", infoMaxWidth, font, 6.5), {
      x: infoX,
      y: cardTop - 20,
      size: 6.5,
      font,
      color: subColor,
    });

    // Club (muted)
    if (player.club) {
      page.drawText(truncate(player.club, infoMaxWidth, font, 6.5), {
        x: infoX,
        y: cardTop - 28,
        size: 6.5,
        font,
        color: subColor,
      });
    }

    // Age group badge (colored pill, white text)
    const ag = calculateAgeGroup(player.dateOfBirth);
    if (ag) {
      const badgeFontSize = 6;
      const badgeTextWidth = fontBold.widthOfTextAtSize(ag, badgeFontSize);
      const badgeWidth = badgeTextWidth + 6;
      const badgeHeight = 8.5;
      const badgeColor = ag === "U14" ? rgb(0.13, 0.4, 0.8) : saintsRed;
      const badgeX = cardX + cardWidth - 4 - badgeWidth;
      page.drawRectangle({
        x: badgeX,
        y: cardBottom + 3.5,
        width: badgeWidth,
        height: badgeHeight,
        color: badgeColor,
      });
      page.drawText(ag, {
        x: badgeX + 3,
        y: cardBottom + 6,
        size: badgeFontSize,
        font: fontBold,
        color: white,
      });
    }
  };

  // Draw each position group section, row by row so a long group can continue
  // onto the next page rather than running off the bottom.
  for (const section of groupedSections) {
    drawSectionHeader(section.label, section.players.length);

    const numRows = Math.ceil(section.players.length / cardCols);
    for (let row = 0; row < numRows; row++) {
      if (y - cardHeight < contentBottom) newPage();
      for (let col = 0; col < cardCols; col++) {
        const i = row * cardCols + col;
        if (i >= section.players.length) break;
        drawPlayerCard(
          section.players[i],
          marginX + col * (cardWidth + cardHGap),
          y,
        );
      }
      y -= cardHeight;
      if (row < numRows - 1) y -= cardVGap;
    }

    y -= sectionGap;
  }

  // Unavailable players — compact info list at the end of the sheet, no cards.
  if (unavailablePlayers.length > 0) {
    const listCols = 4;
    const listColGap = 10;
    const listColWidth = (gridWidth - listColGap * (listCols - 1)) / listCols;
    const listLineHeight = 10;
    const listFontSize = 7;

    if (y - sectionHeaderHeight - listLineHeight < contentBottom) newPage();
    page.drawText(`Not Available (${unavailablePlayers.length})`, {
      x: marginX,
      y,
      size: 10,
      font: fontBold,
      color: rgb(0.45, 0.45, 0.45),
    });
    page.drawLine({
      start: { x: marginX, y: y - 4 },
      end: { x: marginX + gridWidth, y: y - 4 },
      thickness: 0.8,
      color: rgb(0.65, 0.65, 0.65),
    });
    y -= 11;
    page.drawText(
      options?.eventName
        ? `Not registered / unavailable for ${options.eventName}`
        : "Not registered / unavailable",
      {
        x: marginX,
        y,
        size: 7,
        font,
        color: rgb(0.55, 0.55, 0.55),
      },
    );
    y -= 12;

    // Fill column-major so names read down each column, then across.
    const rowsPerCol = Math.ceil(unavailablePlayers.length / listCols);
    for (let row = 0; row < rowsPerCol; row++) {
      if (y - listLineHeight < contentBottom) newPage();
      for (let col = 0; col < listCols; col++) {
        const player = unavailablePlayers[col * rowsPerCol + row];
        if (!player) continue;
        const x = marginX + col * (listColWidth + listColGap);
        const ag = calculateAgeGroup(player.dateOfBirth);
        const meta = [player.position, ag].filter(Boolean).join(" · ");
        // Name takes ~60% of the column so the position/age still shows.
        const nameText = fitName(
          player.name ?? "",
          meta ? listColWidth * 0.6 : listColWidth,
          fontBold,
          listFontSize,
        );
        page.drawText(nameText, {
          x,
          y,
          size: listFontSize,
          font: fontBold,
          color: rgb(0.4, 0.4, 0.4),
        });
        if (meta) {
          const nameWidth = fontBold.widthOfTextAtSize(nameText, listFontSize);
          const metaX = x + nameWidth + 3;
          page.drawText(truncate(meta, x + listColWidth - metaX, font, 6), {
            x: metaX,
            y,
            size: 6,
            font,
            color: rgb(0.6, 0.6, 0.6),
          });
        }
      }
      y -= listLineHeight;
    }
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
  /**
   * Player ids not available for the filtered event. These get no card — they
   * are listed by name at the end of the sheet for information.
   */
  unavailablePlayerIds?: string[];
  /** Name of the event the sheet is filtered by, shown under the header. */
  eventName?: string;
};

export const DownloadButton: React.FC<DownloadButton> = ({
  players,
  teamName,
  unavailablePlayerIds,
  eventName,
}) => {
  return (
    <Button
      variant="outline"
      className="w-full"
      onClick={() =>
        generateTeamPDF(players, teamName, {
          unavailableIds: unavailablePlayerIds
            ? new Set(unavailablePlayerIds)
            : undefined,
          eventName,
        })
      }
    >
      <DownloadIcon />
      <span>Download PDF</span>
    </Button>
  );
};
