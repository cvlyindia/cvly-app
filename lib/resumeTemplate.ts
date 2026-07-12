import jsPDF from 'jspdf';
import { Document, Packer, Paragraph, TextRun, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';
import type { StructuredResume } from './ai';

// Deliberately plain, ATS-safe defaults — the same fonts our own format-check module
// treats as "safe", single column, no tables, no graphics.
const FONT = 'Calibri';

export function structuredResumeToPlainText(r: StructuredResume): string {
  const lines: string[] = [r.name, r.contact, ''];
  if (r.summary) lines.push(r.summary, '');
  if (r.experience.length) {
    lines.push('EXPERIENCE', '');
    for (const e of r.experience) {
      lines.push(`${e.title} — ${e.company}`, e.dates);
      for (const b of e.bullets) lines.push(`• ${b}`);
      lines.push('');
    }
  }
  if (r.education.length) {
    lines.push('EDUCATION', '');
    for (const ed of r.education) {
      lines.push(`${ed.degree} — ${ed.institution}`, ed.dates, '');
    }
  }
  if (r.skills.length) {
    lines.push('SKILLS', '', r.skills.join(', '));
  }
  return lines.join('\n');
}

export async function downloadResumeDocx(filename: string, r: StructuredResume) {
  const children: Paragraph[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
      children: [new TextRun({ text: r.name, bold: true, size: 32, font: FONT })],
    }),
  ];

  if (r.contact) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 240 },
        children: [new TextRun({ text: r.contact, size: 20, font: FONT, color: '555555' })],
      })
    );
  }

  if (r.summary) {
    children.push(
      new Paragraph({
        spacing: { after: 240 },
        children: [new TextRun({ text: r.summary, size: 21, font: FONT })],
      })
    );
  }

  if (r.experience.length) {
    children.push(sectionHeading('EXPERIENCE'));
    for (const e of r.experience) {
      children.push(
        new Paragraph({
          spacing: { before: 160, after: 20 },
          children: [
            new TextRun({ text: `${e.title} — ${e.company}`, bold: true, size: 22, font: FONT }),
          ],
        }),
        new Paragraph({
          spacing: { after: 100 },
          children: [new TextRun({ text: e.dates, italics: true, size: 19, font: FONT, color: '666666' })],
        })
      );
      for (const b of e.bullets) {
        children.push(
          new Paragraph({
            bullet: { level: 0 },
            spacing: { after: 60 },
            children: [new TextRun({ text: b, size: 21, font: FONT })],
          })
        );
      }
    }
  }

  if (r.education.length) {
    children.push(sectionHeading('EDUCATION'));
    for (const ed of r.education) {
      children.push(
        new Paragraph({
          spacing: { before: 120, after: 20 },
          children: [new TextRun({ text: `${ed.degree} — ${ed.institution}`, bold: true, size: 22, font: FONT })],
        }),
        new Paragraph({
          spacing: { after: 100 },
          children: [new TextRun({ text: ed.dates, italics: true, size: 19, font: FONT, color: '666666' })],
        })
      );
    }
  }

  if (r.skills.length) {
    children.push(
      sectionHeading('SKILLS'),
      new Paragraph({
        spacing: { before: 80 },
        children: [new TextRun({ text: r.skills.join(', '), size: 21, font: FONT })],
      })
    );
  }

  const doc = new Document({ sections: [{ children }] });
  const blob = await Packer.toBlob(doc);
  saveAs(blob, filename);
}

function sectionHeading(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 240, after: 100 },
    border: { bottom: { color: 'E85D2C', space: 4, style: 'single', size: 6 } },
    children: [new TextRun({ text, bold: true, size: 22, font: FONT, color: 'E85D2C' })],
  });
}

export function downloadResumePdf(filename: string, r: StructuredResume) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const marginX = 50;
  const pageWidth = doc.internal.pageSize.getWidth();
  const maxWidth = pageWidth - marginX * 2;
  let y = 56;

  const checkPageBreak = (needed: number) => {
    if (y + needed > doc.internal.pageSize.getHeight() - 48) {
      doc.addPage();
      y = 56;
    }
  };

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(20, 20, 22);
  doc.text(r.name, pageWidth / 2, y, { align: 'center' });
  y += 22;

  if (r.contact) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(90, 90, 90);
    doc.text(r.contact, pageWidth / 2, y, { align: 'center' });
    y += 26;
  }

  if (r.summary) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10.5);
    doc.setTextColor(40, 40, 44);
    const lines: string[] = doc.splitTextToSize(r.summary, maxWidth);
    for (const line of lines) {
      checkPageBreak(16);
      doc.text(line, marginX, y);
      y += 15;
    }
    y += 12;
  }

  const sectionHeadingPdf = (title: string) => {
    checkPageBreak(30);
    doc.setDrawColor(232, 93, 44);
    doc.setLineWidth(1.2);
    doc.line(marginX, y, pageWidth - marginX, y);
    y += 16;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(232, 93, 44);
    doc.text(title, marginX, y);
    y += 18;
  };

  if (r.experience.length) {
    sectionHeadingPdf('EXPERIENCE');
    for (const e of r.experience) {
      checkPageBreak(30);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(20, 20, 22);
      doc.text(`${e.title} — ${e.company}`, marginX, y);
      y += 14;
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9.5);
      doc.setTextColor(100, 100, 100);
      doc.text(e.dates, marginX, y);
      y += 16;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10.5);
      doc.setTextColor(40, 40, 44);
      for (const b of e.bullets) {
        const lines: string[] = doc.splitTextToSize(`•  ${b}`, maxWidth - 10);
        for (const line of lines) {
          checkPageBreak(15);
          doc.text(line, marginX + 6, y);
          y += 14;
        }
      }
      y += 10;
    }
  }

  if (r.education.length) {
    sectionHeadingPdf('EDUCATION');
    for (const ed of r.education) {
      checkPageBreak(28);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(20, 20, 22);
      doc.text(`${ed.degree} — ${ed.institution}`, marginX, y);
      y += 14;
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9.5);
      doc.setTextColor(100, 100, 100);
      doc.text(ed.dates, marginX, y);
      y += 20;
    }
  }

  if (r.skills.length) {
    sectionHeadingPdf('SKILLS');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10.5);
    doc.setTextColor(40, 40, 44);
    const lines: string[] = doc.splitTextToSize(r.skills.join(', '), maxWidth);
    for (const line of lines) {
      checkPageBreak(15);
      doc.text(line, marginX, y);
      y += 15;
    }
  }

  doc.save(filename);
}
