import { AlignmentType, BorderStyle, Document, LevelFormat, Packer, Paragraph, TextRun } from "docx";
import type { Block } from "./blocks";

const FONT = "Calibri";
const BODY = 21; // half-points → 10.5pt
const BULLET_REF = "ats-bullets";

function blockToParagraph(b: Block): Paragraph {
  switch (b.type) {
    case "name":
      return new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { after: 40 },
        children: [new TextRun({ text: b.text, bold: true, size: 32, font: FONT })],
      });
    case "subtitle":
      return new Paragraph({
        spacing: { after: 40 },
        children: [new TextRun({ text: b.text, size: 24, font: FONT })],
      });
    case "contact":
      return new Paragraph({
        spacing: { after: 120 },
        children: [new TextRun({ text: b.text, size: BODY, font: FONT })],
      });
    case "heading":
      return new Paragraph({
        spacing: { before: 200, after: 80 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "999999", space: 2 } },
        children: [new TextRun({ text: b.text.toUpperCase(), bold: true, size: 23, font: FONT })],
      });
    case "entry":
      return new Paragraph({
        spacing: { before: 100, after: 40 },
        children: [
          new TextRun({ text: b.title, bold: true, size: BODY, font: FONT }),
          ...(b.meta ? [new TextRun({ text: b.meta, size: BODY, font: FONT, break: 1 })] : []),
        ],
      });
    case "bullet":
      return new Paragraph({
        numbering: { reference: BULLET_REF, level: 0 },
        spacing: { after: 40 },
        children: [new TextRun({ text: b.text, size: BODY, font: FONT })],
      });
    case "spacer":
      return new Paragraph({ children: [] });
    case "text":
      return new Paragraph({
        spacing: { after: 80 },
        children: [new TextRun({ text: b.text, bold: b.bold, size: BODY, font: FONT })],
      });
  }
}

export async function blocksToDocx(blocks: Block[], title: string): Promise<Buffer> {
  const doc = new Document({
    title,
    creator: "Job Finder",
    styles: { default: { document: { run: { font: FONT, size: BODY } } } },
    numbering: {
      config: [
        {
          reference: BULLET_REF,
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: "•",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 360, hanging: 240 } } },
            },
          ],
        },
      ],
    },
    sections: [
      {
        // 0.75" margins, Letter size (Canada uses Letter).
        properties: {
          page: {
            size: { width: 12240, height: 15840 },
            margin: { top: 1080, bottom: 1080, left: 1080, right: 1080 },
          },
        },
        children: blocks.map(blockToParagraph),
      },
    ],
  });
  return Packer.toBuffer(doc);
}
