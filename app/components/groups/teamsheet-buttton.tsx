import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { DownloadIcon } from "lucide-react";
import { Player } from "~/types";
import React from "react";
import { Button } from "../ui/button";
import { calculateAgeGroup } from "~/utils/helpers";
import { ClientOnly } from "~/utils/client-only";

export async function generateTeamPDF(players: Player[], teamName: string) {
  const pdfDoc = await PDFDocument.create();
  let page = pdfDoc.addPage([595.28, 841.89]); // A4 size in points
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const { width, height } = page.getSize();

  const logoBytes = await fetch("/logo.png")
    .then((res) => res.arrayBuffer())
    .then((buf) => new Uint8Array(buf));

  const logoImage = await pdfDoc.embedPng(logoBytes); // or embedJpg()
  const logoDims = logoImage.scale(0.02); // scale down logo to 15% size

  // Draw logo top right with some margin
  const logoX = width - logoDims.width - 50;
  const logoY = height - logoDims.height - 30;
  page.drawImage(logoImage, {
    x: logoX,
    y: logoY,
    width: logoDims.width,
    height: logoDims.height,
  });

  // Group players by position
  const grouped: Record<string, Player[]> = {};
  for (const p of players) {
    if (p?.position) {
      if (!grouped[p?.position]) grouped[p?.position] = [];
      grouped[p?.position].push(p);
    }
  }

  let y = height - 40;

  // Title
  page.drawText(`TEAM SHEET - ${teamName}`, {
    x: 50,
    y,
    size: 11,
    font: fontBold,
    color: rgb(0, 0, 0),
  });
  y -= 40;

  const marginX = 50;
  const tableWidth = 520;

  // Helper function to draw a horizontal light line
  function drawLine(yPos: number) {
    page.drawLine({
      start: { x: marginX, y: yPos },
      end: { x: marginX + tableWidth, y: yPos },
      thickness: 0.5,
      color: rgb(0.7, 0.7, 0.7),
    });
  }

  // Table headers
  const headers = ["pos", "Name", "AG", "Club", "Notes"];
  const headerX = [
    marginX,
    marginX + 75,
    marginX + 180,
    marginX + 210,
    marginX + 320,
  ];
  headers.forEach((text, i) => {
    page.drawText(text, {
      x: headerX[i],
      y,
      size: 8,
      font: fontBold,
    });
  });
  y -= 18;

  drawLine(y + 10);

  // Draw each position table
  for (const [position, group] of Object.entries(grouped)) {
    if (y < 50) {
      // New page if not enough space
      page = pdfDoc.addPage([595.28, 841.89]);
      y = height - 50;
    }

    // Rows
    page.drawLine({
      start: { x: marginX, y: y + 10 },
      end: { x: marginX + tableWidth, y: y + 10 },
      thickness: 1,
      color: rgb(0, 0, 0),
    });
    y -= 8;

    let i = 1;
    for (const player of group) {
      if (y < 50) {
        // Add new page when near bottom
        page = pdfDoc.addPage([595.28, 841.89]);
        y = height - 50;
      }

      page.drawText(player.position, { x: marginX, y, size: 10, font });
      page.drawText(player.name, { x: marginX + 75, y, size: 10, font });

      page.drawText(calculateAgeGroup(player.dateOfBirth) ?? "", {
        x: marginX + 180,
        y,
        size: 10,
        font,
      });
      page.drawText(player.club ?? "", { x: marginX + 210, y, size: 10, font });

      // Notes column left blank - just space

      y -= 18;

      i++;
      // Light horizontal line under row
      if (group.length === i) drawLine(y + 10);

      y -= 8;
    }

    // y -= 0; // space between tables
  }

  const pdfBytes = await pdfDoc.save();
  
  // Check if we're in browser environment
  if (typeof window !== 'undefined' && document) {
    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "teamsheet.pdf";
    link.click();
  }
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
    <ClientOnly>
      <Button
        variant="outline"
        className="w-full"
        onClick={() => generateTeamPDF(players, teamName)}
      >
        <DownloadIcon />
        <span>Download PDF</span>
      </Button>
    </ClientOnly>
  );
};
