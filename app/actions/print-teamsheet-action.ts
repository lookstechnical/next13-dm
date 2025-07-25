// app/routes/generate-pdf.tsx
import { ActionFunctionArgs } from "react-router";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

// Use "pdfkit" as a CommonJS module

type Player = {
  name: string;
  position: string;
  number?: number;
  club?: string;
  ageGroup?: string;
};

// Sample static player data for demo
const players: Player[] = [
  {
    name: "John Smith",
    position: "Goalkeeper",
    number: 1,
    club: "City FC",
    ageGroup: "U12",
  },
  {
    name: "Alice Brown",
    position: "Defender",
    number: 4,
    club: "Eagles",
    ageGroup: "U10",
  },
  {
    name: "Carlos Reyes",
    position: "Defender",
    number: 5,
    club: "Eagles",
    ageGroup: "U10",
  },
  {
    name: "Dani Silva",
    position: "Midfielder",
    number: 8,
    club: "Lions",
    ageGroup: "U12",
  },
  {
    name: "Ella Torres",
    position: "Midfielder",
    number: 10,
    club: "City FC",
    ageGroup: "U12",
  },
  {
    name: "Frank Lee",
    position: "Forward",
    number: 9,
    club: "Tigers",
    ageGroup: "U11",
  },
  {
    name: "Grace Kim",
    position: "Forward",
    number: 11,
    club: "Tigers",
    ageGroup: "U11",
  },
];

// Helper: group players by position
function groupByPosition(players: Player[]): Record<string, Player[]> {
  return players.reduce((acc, player) => {
    if (!acc[player.position]) acc[player.position] = [];
    acc[player.position].push(player);
    return acc;
  }, {} as Record<string, Player[]>);
}

function drawTableHeader(doc: PDFKit.PDFDocument, x: number, y: number) {
  doc.font("Helvetica-Bold").fontSize(11);
  doc.text("No.", x, y);
  doc.text("Name", x + 30, y);
  doc.text("Position", x + 180, y);
  doc.text("Age Group", x + 270, y);
  doc.text("Club", x + 350, y);
  doc.text("Notes", x + 440, y);
  doc
    .moveTo(x, y + 14)
    .lineTo(x + 520, y + 14)
    .stroke();
}

function drawTableRow(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  player: Player
) {
  doc.font("Helvetica").fontSize(10);
  doc.text(player.number?.toString() ?? "", x, y);
  doc.text(player.name, x + 30, y);
  doc.text(player.position, x + 180, y);
  doc.text(player.ageGroup ?? "", x + 270, y);
  doc.text(player.club ?? "", x + 350, y);
  doc.rect(x + 440, y - 2, 80, 14).stroke(); // Notes box
}

export async function printTeamsheet({ request }: ActionFunctionArgs) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4 size
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const { width, height } = page.getSize();

  const grouped: Record<string, typeof players> = {};
  for (const p of players) {
    if (!grouped[p.position]) grouped[p.position] = [];
    grouped[p.position].push(p);
  }

  let y = height - 50;

  page.drawText("TEAM SHEET", {
    x: 50,
    y,
    size: 18,
    font,
    color: rgb(0, 0, 0),
  });

  y -= 30;

  for (const [position, group] of Object.entries(grouped)) {
    page.drawText(position.toUpperCase(), {
      x: 50,
      y,
      size: 14,
      font,
      color: rgb(0, 0, 0),
    });
    y -= 20;

    // Headers
    page.drawText("No.", { x: 50, y, size: 10, font });
    page.drawText("Name", { x: 80, y, size: 10, font });
    page.drawText("Age Group", { x: 220, y, size: 10, font });
    page.drawText("Club", { x: 300, y, size: 10, font });
    page.drawText("Notes", { x: 400, y, size: 10, font });
    y -= 15;

    for (const player of group) {
      if (y < 50) {
        y = height - 50;
        page.drawText("(continued)", { x: 450, y, font, size: 8 });
        y -= 30;
      }

      page.drawText(player.number?.toString() ?? "", {
        x: 50,
        y,
        size: 10,
        font,
      });
      page.drawText(player.name, { x: 80, y, size: 10, font });
      page.drawText(player.ageGroup ?? "", { x: 220, y, size: 10, font });
      page.drawText(player.club ?? "", { x: 300, y, size: 10, font });

      // Draw an empty notes box
      page.drawRectangle({
        x: 400,
        y: y - 2,
        width: 120,
        height: 12,
        borderColor: rgb(0, 0, 0),
        borderWidth: 1,
      });

      y -= 18;
    }

    y -= 20;
  }

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes], { type: "application/pdf" });

  return new Response(blob, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="teamsheet.pdf"`,
    },
  });
}
