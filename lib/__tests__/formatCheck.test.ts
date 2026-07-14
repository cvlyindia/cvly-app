import { describe, it, expect } from 'vitest';
import { runFormatCheck } from '@/lib/formatCheck';
import { buildTestDocx, cleanResumeBody } from './docxFixtures';

const DOCX_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const PDF_TYPE = 'application/pdf';

describe('runFormatCheck — plain text (no file structure to inspect)', () => {
  it('skips structural checking entirely for a fileType with no file structure', async () => {
    const result = await runFormatCheck('text/plain', Buffer.from(''), cleanResumeBody());
    expect(result.checked).toBe(false);
    expect(result.score).toBe(100);
    expect(result.issues).toHaveLength(0);
  });
});

describe('runFormatCheck — DOCX structural inspection', () => {
  it('scores a genuinely clean, single-column resume at 100 with no issues', async () => {
    const buf = await buildTestDocx(cleanResumeBody());
    const result = await runFormatCheck(DOCX_TYPE, buf, cleanResumeBody());
    expect(result.checked).toBe(true);
    expect(result.score).toBe(100);
    expect(result.issues).toHaveLength(0);
    expect(result.passed).toContain('No tables detected');
    expect(result.passed).toContain('Single-column layout');
  });

  it('flags a table as a high-severity issue — the #1 documented cause of silent ATS rejection', async () => {
    const bodyWithTable = cleanResumeBody() + '<w:tbl><w:tr><w:tc><w:p><w:r><w:t>cell</w:t></w:r></w:p></w:tc></w:tr></w:tbl>';
    const buf = await buildTestDocx(bodyWithTable);
    const result = await runFormatCheck(DOCX_TYPE, buf, cleanResumeBody());
    const tableIssue = result.issues.find((i) => i.title.includes('table'));
    expect(tableIssue).toBeDefined();
    expect(tableIssue?.severity).toBe('high');
    expect(result.score).toBeLessThan(100);
  });

  it('flags a multi-column layout as a medium-severity issue', async () => {
    const bodyWithColumns = `<w:sectPr><w:cols w:num="2"/></w:sectPr>` + cleanResumeBody();
    const buf = await buildTestDocx(bodyWithColumns);
    const result = await runFormatCheck(DOCX_TYPE, buf, cleanResumeBody());
    const colIssue = result.issues.find((i) => i.title.includes('column'));
    expect(colIssue).toBeDefined();
    expect(colIssue?.severity).toBe('medium');
  });

  it('does not flag a genuinely single-column section as a column issue', async () => {
    const bodyWithOneColumn = `<w:sectPr><w:cols w:num="1"/></w:sectPr>` + cleanResumeBody();
    const buf = await buildTestDocx(bodyWithOneColumn);
    const result = await runFormatCheck(DOCX_TYPE, buf, cleanResumeBody());
    expect(result.passed).toContain('Single-column layout');
  });

  it('flags a text box as a high-severity issue — content inside one can be entirely invisible to a parser', async () => {
    const bodyWithTextbox = cleanResumeBody() + '<w:pict><v:shape><txbxContent><w:p><w:r><w:t>hidden</w:t></w:r></w:p></txbxContent></v:shape></w:pict>';
    const buf = await buildTestDocx(bodyWithTextbox);
    const result = await runFormatCheck(DOCX_TYPE, buf, cleanResumeBody());
    const textboxIssue = result.issues.find((i) => i.title.includes('Text box'));
    expect(textboxIssue).toBeDefined();
    expect(textboxIssue?.severity).toBe('high');
  });

  it('flags embedded images as a medium-severity issue', async () => {
    const bodyWithImage = cleanResumeBody() + '<w:drawing><a:blip r:embed="rId4"/></w:drawing>';
    const buf = await buildTestDocx(bodyWithImage);
    const result = await runFormatCheck(DOCX_TYPE, buf, cleanResumeBody());
    const imageIssue = result.issues.find((i) => i.title.includes('image'));
    expect(imageIssue).toBeDefined();
    expect(imageIssue?.severity).toBe('medium');
  });

  it('flags real content in the header/footer, but ignores an empty or trivial one', async () => {
    const buf = await buildTestDocx(cleanResumeBody(), {
      'word/header1.xml': '<w:hdr><w:p><w:r><w:t>Jane Doe - Confidential Resume Document</w:t></w:r></w:p></w:hdr>',
    });
    const result = await runFormatCheck(DOCX_TYPE, buf, cleanResumeBody());
    const headerIssue = result.issues.find((i) => i.title.includes('header or footer'));
    expect(headerIssue).toBeDefined();

    const bufEmpty = await buildTestDocx(cleanResumeBody(), {
      'word/header1.xml': '<w:hdr><w:p><w:r><w:t></w:t></w:r></w:p></w:hdr>',
    });
    const resultEmpty = await runFormatCheck(DOCX_TYPE, bufEmpty, cleanResumeBody());
    expect(resultEmpty.passed).toContain('No content hidden in header/footer');
  });

  it('checks footer files too, not just header files — a real bug found and fixed earlier in this build', async () => {
    const buf = await buildTestDocx(cleanResumeBody(), {
      'word/footer1.xml': '<w:ftr><w:p><w:r><w:t>jane.doe@email.com | +91 98765 43210</w:t></w:r></w:p></w:ftr>',
    });
    const result = await runFormatCheck(DOCX_TYPE, buf, cleanResumeBody());
    const footerIssue = result.issues.find((i) => i.title.includes('header or footer'));
    expect(footerIssue).toBeDefined();
  });

  it('stacks deductions correctly across multiple simultaneous issues — a table (high, -30) plus embedded images (medium, -15) should land at exactly 55', async () => {
    const bodyWithBoth = cleanResumeBody()
      + '<w:tbl><w:tr><w:tc><w:p><w:r><w:t>cell</w:t></w:r></w:p></w:tc></w:tr></w:tbl>'
      + '<w:drawing><a:blip r:embed="rId4"/></w:drawing>';
    const buf = await buildTestDocx(bodyWithBoth);
    const result = await runFormatCheck(DOCX_TYPE, buf, cleanResumeBody());
    expect(result.score).toBe(55);
  });

  it('never lets the score go negative even with many stacked high-severity issues', async () => {
    const bodyWithEverything = cleanResumeBody()
      + '<w:tbl><w:tr><w:tc><w:p><w:r><w:t>c</w:t></w:r></w:p></w:tc></w:tr></w:tbl>'
      + '<w:pict><v:shape><txbxContent><w:p><w:r><w:t>x</w:t></w:r></w:p></txbxContent></v:shape></w:pict>';
    const buf = await buildTestDocx(bodyWithEverything, {
      'word/header1.xml': '<w:hdr><w:p><w:r><w:t>Some real header content here</w:t></w:r></w:p></w:hdr>',
    });
    const result = await runFormatCheck(DOCX_TYPE, buf, 'gibberish with no real section headings at all');
    expect(result.score).toBeGreaterThanOrEqual(0);
  });

  it('fails gracefully on a genuinely corrupted DOCX buffer instead of throwing, without crashing the rest of the pipeline', async () => {
    const corrupted = Buffer.from('this is not a real zip file at all');
    // Pass realistic resume text so the separate, correctly-applied section-header/date
    // checks don't add unrelated deductions — this test isolates DOCX-parsing failure
    // specifically, not the combined scoring pipeline (covered elsewhere).
    const result = await runFormatCheck(DOCX_TYPE, corrupted, cleanResumeBody());
    expect(result.checked).toBe(false); // the actual thing being verified: no crash, marked unverified
    expect(result.score).toBe(100); // structural checks contributed zero deductions, as expected
  });
});

describe('runFormatCheck — PDF text density (catches scanned/image-based PDFs)', () => {
  it('passes a PDF with genuinely dense, selectable text', async () => {
    // Includes real resume headings so section-header checks (tested separately) don't
    // add unrelated deductions here — this isolates text-density behavior specifically.
    const denseText = cleanResumeBody().repeat(3); // well over 150 chars for 1 page
    const result = await runFormatCheck(PDF_TYPE, Buffer.from(''), denseText, 1);
    expect(result.passed).toContain('Text is selectable, not a scanned image');
    expect(result.issues.some((i) => i.title.includes('scanned'))).toBe(false);
  });

  it('flags a PDF with almost no extractable text as likely scanned/image-based', async () => {
    const almostNoText = 'Jane';
    const result = await runFormatCheck(PDF_TYPE, Buffer.from(''), almostNoText, 1);
    const scanIssue = result.issues.find((i) => i.title.includes('scanned'));
    expect(scanIssue).toBeDefined();
    expect(scanIssue?.severity).toBe('high');
  });

  it('correctly divides by page count — the same total text spread across many pages should be flagged, not passed', async () => {
    const text = cleanResumeBody() + 'A'.repeat(200); // real headings + 200 filler chars
    const onePage = await runFormatCheck(PDF_TYPE, Buffer.from(''), text, 1); // dense enough — passes
    const tenPages = await runFormatCheck(PDF_TYPE, Buffer.from(''), text, 10); // thin per-page — fails
    expect(onePage.issues.some((i) => i.title.includes('scanned'))).toBe(false);
    expect(tenPages.issues.some((i) => i.title.includes('scanned'))).toBe(true);
  });
});

describe('runFormatCheck — date consistency (layered on top of DOCX/PDF checks)', () => {
  it('passes a resume using one consistent date style throughout', async () => {
    const text = 'Jan 2020 - Mar 2022, then Apr 2022 - Present';
    const buf = await buildTestDocx(cleanResumeBody());
    const result = await runFormatCheck(DOCX_TYPE, buf, cleanResumeBody() + ' ' + text);
    expect(result.passed).toContain('Consistent date format throughout');
  });

  it('flags a resume mixing two different date styles', async () => {
    const text = 'Jan 2020 - Mar 2022, then 04/2022 - Present';
    const buf = await buildTestDocx(cleanResumeBody());
    const result = await runFormatCheck(DOCX_TYPE, buf, cleanResumeBody() + ' ' + text);
    const dateIssue = result.issues.find((i) => i.title === 'Mixed date formats');
    expect(dateIssue).toBeDefined();
    expect(dateIssue?.severity).toBe('low');
  });
});

describe('runFormatCheck — section headers', () => {
  it('recognizes standard heading variants (not just one exact phrase)', async () => {
    const withVariant = 'Professional Experience\nEducation\nTechnical Skills';
    const buf = await buildTestDocx(cleanResumeBody());
    const result = await runFormatCheck(DOCX_TYPE, buf, withVariant);
    expect(result.passed).toContain('Standard experience section heading found');
    expect(result.passed).toContain('Standard education heading found');
    expect(result.passed).toContain('Standard skills heading found');
  });

  it('flags missing standard headings individually — one missing heading should not suppress the others', async () => {
    const missingSkills = 'Work Experience\nSoftware Engineer\nEducation\nBTech';
    const buf = await buildTestDocx(cleanResumeBody());
    const result = await runFormatCheck(DOCX_TYPE, buf, missingSkills);
    expect(result.passed).toContain('Standard experience section heading found');
    expect(result.passed).toContain('Standard education heading found');
    expect(result.issues.some((i) => i.title.includes('Skills'))).toBe(true);
  });
});
