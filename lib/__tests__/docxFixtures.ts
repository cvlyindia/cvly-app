import JSZip from 'jszip';

/**
 * Builds a minimal but valid DOCX buffer. The format-check module only ever reads
 * word/document.xml (and word/header*.xml, word/footer*.xml when present), so this
 * only constructs what's actually needed to exercise that code — not a full, real
 * Word document. Precise control over the exact XML fragment lets each test target
 * one specific structural pattern (a table, a multi-column section, a text box)
 * without depending on exactly what a higher-level document-building library happens
 * to emit internally.
 */
export async function buildTestDocx(
  bodyXml: string,
  extraFiles: Record<string, string> = {}
): Promise<Buffer> {
  const zip = new JSZip();
  zip.file(
    'word/document.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>${bodyXml}</w:body>
</w:document>`
  );
  for (const [path, content] of Object.entries(extraFiles)) {
    zip.file(path, content);
  }
  return zip.generateAsync({ type: 'nodebuffer' });
}

function paragraph(text: string): string {
  return `<w:p><w:r><w:t>${text}</w:t></w:r></w:p>`;
}

/** A clean resume body with all three standard section headings and no structural issues. */
export function cleanResumeBody(): string {
  return [
    paragraph('Jane Doe'),
    paragraph('Work Experience'),
    paragraph('Software Engineer, Acme Corp, Jan 2020 - Mar 2022'),
    paragraph('Education'),
    paragraph('BTech Computer Science, 2016 - 2020'),
    paragraph('Skills'),
    paragraph('Python, SQL, Product Strategy'),
  ].join('');
}
