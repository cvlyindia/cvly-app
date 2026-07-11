import jsPDF from 'jspdf';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';

export type ExportBlock =
  | { type: 'title'; text: string }
  | { type: 'heading'; text: string }
  | { type: 'body'; text: string }
  | { type: 'space' };

export function downloadTxt(filename: string, blocks: ExportBlock[]) {
  const lines: string[] = [];
  for (const b of blocks) {
    if (b.type === 'title') lines.push(b.text.toUpperCase(), '='.repeat(b.text.length));
    else if (b.type === 'heading') lines.push('', b.text.toUpperCase());
    else if (b.type === 'body') lines.push(b.text);
    else lines.push('');
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
  saveAs(blob, filename);
}

export function downloadPdf(filename: string, blocks: ExportBlock[]) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const marginX = 48;
  const pageWidth = doc.internal.pageSize.getWidth();
  const maxWidth = pageWidth - marginX * 2;
  let y = 64;

  const checkPageBreak = (needed: number) => {
    if (y + needed > doc.internal.pageSize.getHeight() - 48) {
      doc.addPage();
      y = 64;
    }
  };

  for (const b of blocks) {
    if (b.type === 'title') {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.setTextColor(20, 20, 22);
      checkPageBreak(28);
      doc.text(b.text, marginX, y);
      y += 10;
      doc.setDrawColor(230, 230, 230);
      doc.line(marginX, y, pageWidth - marginX, y);
      y += 24;
    } else if (b.type === 'heading') {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(232, 93, 44);
      checkPageBreak(24);
      doc.text(b.text.toUpperCase(), marginX, y);
      y += 18;
    } else if (b.type === 'body') {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10.5);
      doc.setTextColor(40, 40, 44);
      const lines: string[] = doc.splitTextToSize(b.text, maxWidth);
      for (const line of lines) {
        checkPageBreak(16);
        doc.text(line, marginX, y);
        y += 15;
      }
      y += 6;
    } else {
      y += 10;
    }
  }

  doc.save(filename);
}

export async function downloadDocx(filename: string, blocks: ExportBlock[]) {
  const children: Paragraph[] = [];

  for (const b of blocks) {
    if (b.type === 'title') {
      children.push(new Paragraph({ text: b.text, heading: HeadingLevel.TITLE, spacing: { after: 240 } }));
    } else if (b.type === 'heading') {
      children.push(new Paragraph({ text: b.text, heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 120 } }));
    } else if (b.type === 'body') {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: b.text })],
          spacing: { after: 120 },
        })
      );
    } else {
      children.push(new Paragraph({ text: '' }));
    }
  }

  const doc = new Document({ sections: [{ children }] });
  const blob = await Packer.toBlob(doc);
  saveAs(blob, filename);
}
