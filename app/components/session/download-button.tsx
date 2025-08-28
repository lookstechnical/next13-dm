import { SessionItem } from "~/types";
import { Button } from "../ui/button";
import { DownloadIcon } from "lucide-react";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

type DownloadButton = {
  sessionItems: SessionItem[];
};

// Helper to remove HTML tags
function stripHTML(html: string) {
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.innerText;
}
async function generatePDF(items: SessionItem[]) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage();
  const { width, height } = page.getSize();
  let y = height - 40;

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const cardMargin = 20;
  const cardPadding = 10;
  const cardWidth = width - cardMargin * 2;

  for (const item of items) {
    const cardHeight = 100 + item.description.split("\n").length * 14; // rough estimate
    if (y - cardHeight < 40) {
      // new page
      pdfDoc.addPage();
      y = height - 40;
    }

    // Draw card background
    page.drawRectangle({
      x: cardMargin,
      y: y - cardHeight,
      width: cardWidth,
      height: cardHeight,
      color: rgb(1, 1, 1),
      borderColor: rgb(0.3, 0.3, 0.4),
      borderWidth: 1,
    });

    let textX = cardMargin + cardPadding;
    let textY = y - cardPadding - 6;

    // Title
    page.drawText(`Title: ${item?.drills?.name}`, {
      x: textX,
      y: textY,
      font: fontBold,
      size: 12,
      color: rgb(0, 0, 0),
    });
    textY -= 16;

    // Description (wrap lines)
    const descLines = stripHTML(item?.drills?.description.split("\n") || "");
    page.drawText(`Description:`, {
      x: textX,
      y: textY,
      font: fontBold,
      size: 12,
      color: rgb(0, 0, 0),
    });
    textY -= 14;
    for (let line of descLines) {
      page.drawText(line, {
        x: textX + 10,
        y: textY,
        font,
        size: 12,
        color: rgb(0, 0, 0),
      });
      textY -= 14;
    }

    // Intensity, Responsible, Duration
    page.drawText(`Intensity: ${item?.drills?.intensity}`, {
      x: textX,
      y: textY,
      font,
      size: 12,
      color: rgb(0, 0, 0),
    });
    textY -= 14;
    page.drawText(`Responsible: ${item.responsible}`, {
      x: textX,
      y: textY,
      font,
      size: 12,
      color: rgb(0, 0, 0),
    });
    textY -= 14;
    page.drawText(`Duration: ${item.duration}`, {
      x: textX,
      y: textY,
      font,
      size: 12,
      color: rgb(0, 0, 0),
    });

    y -= cardHeight + 20; // spacing between cards
  }

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
      onClick={() => generatePDF(sessionItems)}
    >
      <DownloadIcon />
      <span>Download PDF</span>
    </Button>
  );
};
