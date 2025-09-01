import { SessionItem } from "~/types";
import { Button } from "../ui/button";
import { DownloadIcon } from "lucide-react";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

type DownloadButton = {
  sessionItems: SessionItem[];
};

function stripHtml(html) {
  return html
    .replace(/<\/p>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n\s*\n/g, "\n")
    .trim();
}

function wrapText(text, font, fontSize, maxWidth) {
  if (!text) return [];
  const words = text.split(/\s+/);
  let line = "";
  const lines = [];
  for (let word of words) {
    const testLine = line ? line + " " + word : word;
    const width = font.widthOfTextAtSize(testLine, fontSize);
    if (width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = testLine;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export async function generateSessionPlanPDF(items) {
  const pdfDoc = await PDFDocument.create();
  let page = pdfDoc.addPage([595.28, 841.89]); // A4
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const fontSize = 11;
  const margin = 40;
  const usableWidth = page.getWidth() - margin * 2;
  const baseWidths = [145, 250, 120, 60]; // proportions
  const totalBase = baseWidths.reduce((a, b) => a + b, 0);
  const scale = usableWidth / totalBase;
  const colWidths = baseWidths.map((w) => w * scale);
  const rowMinHeight = 22;
  const cellPadding = 5;
  let y = page.getHeight() - margin;

  // --- Draw Header ---
  function drawHeader() {
    let x = margin;
    const headers = ["Title", "Description", "Responsible", "Duration"];
    headers.forEach((header, i) => {
      page.drawRectangle({
        x,
        y: y - rowMinHeight,
        width: colWidths[i],
        height: rowMinHeight,
        borderColor: rgb(0, 0, 0),
        borderWidth: 1,
      });
      page.drawText(header, {
        x: x + cellPadding,
        y: y - fontSize - 5,
        font: boldFont,
        size: fontSize,
        color: rgb(0, 0, 0),
      });
      x += colWidths[i];
    });
    y -= rowMinHeight;
  }

  drawHeader();

  // --- Draw Row ---
  function drawRow(item) {
    const drillName = item.drills?.name || "";
    const drillDescription = stripHtml(item.drills?.description || "");
    const rootDescription = item.description || "";
    const intensity = item.drills?.intensity || "";
    const responsible = item.assignedTo || "";
    const duration = item.duration || "";

    const drillNameLines = wrapText(
      drillName,
      font,
      fontSize,
      colWidths[0] - cellPadding * 2
    );
    // Wrap text
    const descriptionLines = wrapText(
      drillDescription,
      font,
      fontSize,
      colWidths[1] - cellPadding * 2
    );
    const rootLines = wrapText(
      rootDescription,
      font,
      fontSize,
      colWidths[1] - cellPadding * 2
    );
    const intensityLines = wrapText(
      intensity,
      boldFont,
      fontSize,
      colWidths[1] - cellPadding * 2
    );
    const responsibles = responsible.split(/[,|-]/).map((r) => r.trim());

    let responsibleLines: string[] = [];
    responsibles.forEach((r) => {
      const wrapped = wrapText(
        r,
        font,
        fontSize,
        colWidths[2] - cellPadding * 2
      ); // fit to col width
      responsibleLines = responsibleLines.concat(wrapped);
    });

    // Compute row height
    const descCount =
      descriptionLines.length + rootLines.length + intensityLines.length;
    const maxLines = Math.max(descCount, responsibleLines.length, 1);
    const rowHeight = Math.max(maxLines * (fontSize + 3) + 10, rowMinHeight);

    // Page break if needed
    if (y - rowHeight < margin) {
      page = pdfDoc.addPage([595.28, 841.89]);
      y = page.getHeight() - margin;
      drawHeader();
    }

    let x = margin;

    // Title cell
    page.drawRectangle({
      x,
      y: y - rowHeight,
      width: colWidths[0],
      height: rowHeight,
      borderColor: rgb(0, 0, 0),
      borderWidth: 1,
    });
    // page.drawText(drillName, {
    //   x: x + cellPadding,
    //   y: y - fontSize - 5,
    //   font,
    //   size: fontSize,
    //   color: rgb(0, 0, 0),
    // });
    let textY = y - fontSize - 5;
    drillNameLines.forEach((line) => {
      page.drawText(line, {
        x: x + cellPadding,
        y: textY,
        font,
        size: fontSize,
        color: rgb(0, 0, 0),
      });
      textY -= fontSize + 3;
    });
    x += colWidths[0];

    // Description cell
    page.drawRectangle({
      x,
      y: y - rowHeight,
      width: colWidths[1],
      height: rowHeight,
      borderColor: rgb(0, 0, 0),
      borderWidth: 1,
    });

    textY = y - fontSize - 5;
    descriptionLines.forEach((line) => {
      page.drawText(line, {
        x: x + cellPadding,
        y: textY,
        font,
        size: fontSize,
        color: rgb(0, 0, 0),
      });
      textY -= fontSize + 3;
    });
    rootLines.forEach((line) => {
      page.drawText(line, {
        x: x + cellPadding,
        y: textY,
        font,
        size: fontSize,
        color: rgb(0, 0, 1),
      });
      textY -= fontSize + 3;
    });
    intensityLines.forEach((line) => {
      page.drawText(line, {
        x: x + cellPadding,
        y: textY,
        font: boldFont,
        size: fontSize,
        color: rgb(1, 0, 0),
      });
      textY -= fontSize + 3;
    });
    x += colWidths[1];

    // Responsible cell
    page.drawRectangle({
      x,
      y: y - rowHeight,
      width: colWidths[2],
      height: rowHeight,
      borderColor: rgb(0, 0, 0),
      borderWidth: 1,
    });
    textY = y - fontSize - 5;
    responsibleLines.forEach((name) => {
      page.drawText(name, {
        x: x + cellPadding,
        y: textY,
        font,
        size: fontSize,
        color: rgb(0, 0, 0),
      });
      textY -= fontSize + 3;
    });
    x += colWidths[2];

    // Duration cell (right-aligned)
    page.drawRectangle({
      x,
      y: y - rowHeight,
      width: colWidths[3],
      height: rowHeight,
      borderColor: rgb(0, 0, 0),
      borderWidth: 1,
    });
    const durationWidth = boldFont.widthOfTextAtSize(duration, fontSize);
    page.drawText(duration, {
      x: x + colWidths[3] - durationWidth - cellPadding,
      y: y - fontSize - 5,
      font: boldFont,
      size: fontSize,
      color: rgb(0, 0, 0),
    });

    y -= rowHeight;
  }

  // --- Draw all items ---
  items.forEach((item) => {
    drawRow(item);
  });

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes], { type: "application/pdf" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "session-plan.pdf";
  link.click();
}

export const SessionDownloadButton: React.FC<DownloadButton> = ({
  sessionItems,
}) => {
  return (
    <Button
      variant="outline"
      className="text-foreground"
      onClick={() => generateSessionPlanPDF(sessionItems)}
    >
      <DownloadIcon />
      <span>Download PDF</span>
    </Button>
  );
};
