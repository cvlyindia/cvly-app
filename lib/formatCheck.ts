import JSZip from 'jszip';

export interface FormatIssue {
  severity: 'high' | 'medium' | 'low';
  title: string;
  detail: string;
}

export interface FormatCheckResult {
  score: number;
  issues: FormatIssue[];
  passed: string[];
  checked: boolean;
}

const STANDARD_EXPERIENCE_HEADERS = /\b(work experience|professional experience|employment history|experience)\b/i;
const STANDARD_EDUCATION_HEADERS = /\beducation\b/i;
const STANDARD_SKILLS_HEADERS = /\b(skills|technical skills|core competencies)\b/i;

function deductFor(severity: FormatIssue['severity']): number {
  if (severity === 'high') return 30;
  if (severity === 'medium') return 15;
  return 10;
}

function scoreFromIssues(issues: FormatIssue[]): number {
  const deduction = issues.reduce((sum, i) => sum + deductFor(i.severity), 0);
  return Math.max(0, 100 - deduction);
}

/**
 * Inspects a DOCX file's actual XML structure for the formatting patterns that
 * documented ATS research (Workday, Taleo, iCIMS parsing behavior) shows cause
 * silent rejection — independent of what the resume's content actually says.
 */
async function checkDocx(buffer: Buffer): Promise<FormatCheckResult> {
  const issues: FormatIssue[] = [];
  const passed: string[] = [];

  try {
    const zip = await JSZip.loadAsync(buffer);
    const docXml = await zip.file('word/document.xml')?.async('string');

    if (!docXml) {
      return { score: 100, issues: [], passed: [], checked: false };
    }

    // Tables — ATS parsers read linearly; table cells get scrambled or skipped entirely
    const tableMatches = docXml.match(/<w:tbl[ >]/g);
    if (tableMatches && tableMatches.length > 0) {
      issues.push({
        severity: 'high',
        title: `${tableMatches.length} table${tableMatches.length > 1 ? 's' : ''} detected`,
        detail: 'Tables are read cell-by-cell out of order by most ATS parsers, or skipped entirely. Workday and Taleo are especially strict about this. Use plain bullet points or a vertical bar list instead.',
      });
    } else {
      passed.push('No tables detected');
    }

    // Multi-column section layout — real word-processor columns, not tables
    const colMatch = docXml.match(/<w:cols[^>]*w:num="(\d+)"/);
    if (colMatch && parseInt(colMatch[1], 10) > 1) {
      issues.push({
        severity: 'medium',
        title: `${colMatch[1]}-column layout detected`,
        detail: 'Multi-column layouts can cause parsers to read across columns instead of down each one, mixing unrelated content together. A single-column layout is the only format that parses correctly on every ATS.',
      });
    } else {
      passed.push('Single-column layout');
    }

    // Text boxes — floating content that many parsers treat as outside the main text flow
    if (docXml.includes('txbxContent') || docXml.includes('<w:pict')) {
      issues.push({
        severity: 'high',
        title: 'Text box detected',
        detail: 'Content inside a text box is often invisible to ATS parsers entirely — it\'s treated as a floating graphic, not text. If your name, contact info, or a skills sidebar is in a text box, it may never reach the recruiter\'s database.',
      });
    } else {
      passed.push('No text boxes');
    }

    // Embedded images/graphics (skill bars, icons, headshots, charts)
    const imageMatches = docXml.match(/r:embed="/g);
    if (imageMatches && imageMatches.length > 0) {
      issues.push({
        severity: 'medium',
        title: `${imageMatches.length} embedded image${imageMatches.length > 1 ? 's' : ''} detected`,
        detail: 'Images, icons, skill-level graphics, and photos are invisible to ATS text parsers. Any information conveyed only through a graphic (like a skill bar) doesn\'t reach the recruiter at all.',
      });
    } else {
      passed.push('No embedded graphics');
    }

    // Header/footer content — many ATS parsers skip these entirely
    const headerFooterFiles = Object.keys(zip.files).filter((f) => /word\/(header|footer)\d*\.xml/.test(f));
    let headerFooterHasContent = false;
    for (const hf of headerFooterFiles) {
      const content = await zip.file(hf)?.async('string');
      if (content) {
        const textMatch = content.match(/<w:t[^>]*>([^<]+)<\/w:t>/g);
        const text = (textMatch ?? []).join(' ').replace(/<[^>]+>/g, '').trim();
        if (text.length > 15) headerFooterHasContent = true;
      }
    }
    if (headerFooterHasContent) {
      issues.push({
        severity: 'medium',
        title: 'Content found in header or footer',
        detail: 'Many ATS parsers skip headers and footers entirely. If your name or contact details are only there, some systems may never register them.',
      });
    } else {
      passed.push('No content hidden in header/footer');
    }

    return { score: scoreFromIssues(issues), issues, passed, checked: true };
  } catch {
    return { score: 100, issues: [], passed: [], checked: false };
  }
}

/**
 * For PDFs, the file structure itself isn't inspectable the way DOCX XML is, but the
 * single most damaging PDF failure mode — an image-based/scanned PDF with no real text
 * layer — shows up clearly in how little text a real extraction step produces per page.
 */
function checkPdfTextDensity(extractedText: string, numPages: number): FormatCheckResult {
  const issues: FormatIssue[] = [];
  const passed: string[] = [];

  const charsPerPage = numPages > 0 ? extractedText.length / numPages : extractedText.length;

  if (charsPerPage < 150) {
    issues.push({
      severity: 'high',
      title: 'This looks like a scanned or image-based PDF',
      detail: 'Almost no selectable text was found in this file. If this PDF was exported from a design tool or is a scanned image, ATS software cannot read any of it — it will look completely empty to a recruiter\'s system, regardless of your actual content.',
    });
  } else {
    passed.push('Text is selectable, not a scanned image');
  }

  return { score: scoreFromIssues(issues), issues, passed, checked: true };
}

function checkDateConsistency(extractedText: string, existing: FormatCheckResult): FormatCheckResult {
  const issues = [...existing.issues];
  const passed = [...existing.passed];

  // Three common date-range styles seen in resumes. Mixing them within one document
  // is a recognized, real inconsistency that reads as sloppy and can confuse some
  // date-parsing logic — but it never blocks the resume from being read, hence 'low'.
  const monthNameStyle = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{4}\b/gi;
  const numericSlashStyle = /\b(0?[1-9]|1[0-2])[/-]\d{4}\b/g;
  const isoStyle = /\b\d{4}-(0?[1-9]|1[0-2])\b/g;

  const styles: { name: string; count: number }[] = [
    { name: 'Month YYYY (e.g. "Jan 2022")', count: (extractedText.match(monthNameStyle) ?? []).length },
    { name: 'MM/YYYY (e.g. "01/2022")', count: (extractedText.match(numericSlashStyle) ?? []).length },
    { name: 'YYYY-MM (e.g. "2022-01")', count: (extractedText.match(isoStyle) ?? []).length },
  ];

  const stylesUsed = styles.filter((s) => s.count > 0);

  if (stylesUsed.length > 1) {
    issues.push({
      severity: 'low',
      title: 'Mixed date formats',
      detail: `Found ${stylesUsed.map((s) => s.name).join(' and ')} used in the same resume. Pick one style and use it for every date — it reads as more careful, and keeps date parsing consistent.`,
    });
  } else if (stylesUsed.length === 1) {
    passed.push('Consistent date format throughout');
  }

  return { score: scoreFromIssues(issues), issues, passed, checked: existing.checked };
}

function checkSectionHeaders(extractedText: string, existing: FormatCheckResult): FormatCheckResult {
  const issues = [...existing.issues];
  const passed = [...existing.passed];

  if (!STANDARD_EXPERIENCE_HEADERS.test(extractedText)) {
    issues.push({
      severity: 'low',
      title: 'No standard "Work Experience" heading found',
      detail: 'ATS parsers look for specific section labels to know where your experience section starts. Creative headings like "My Journey" often aren\'t recognized — stick to "Work Experience," "Professional Experience," or "Employment History."',
    });
  } else {
    passed.push('Standard experience section heading found');
  }

  if (!STANDARD_EDUCATION_HEADERS.test(extractedText)) {
    issues.push({
      severity: 'low',
      title: 'No standard "Education" heading found',
      detail: 'Make sure your education section uses the heading "Education" so parsers can find it.',
    });
  } else {
    passed.push('Standard education heading found');
  }

  if (!STANDARD_SKILLS_HEADERS.test(extractedText)) {
    issues.push({
      severity: 'low',
      title: 'No standard "Skills" heading found',
      detail: 'A dedicated "Skills" section, clearly labeled, is what most ATS platforms search first for keyword matches.',
    });
  } else {
    passed.push('Standard skills heading found');
  }

  // Preserve an upstream checked:false (e.g. a corrupted DOCX we couldn't structurally
  // inspect) — heading text-matching alone shouldn't upgrade an unverified result to verified.
  return { score: scoreFromIssues(issues), issues, passed, checked: existing.checked };
}

export async function runFormatCheck(
  fileType: string,
  buffer: Buffer,
  extractedText: string,
  pdfPageCount?: number
): Promise<FormatCheckResult> {
  let result: FormatCheckResult;

  if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    result = await checkDocx(buffer);
  } else if (fileType === 'application/pdf') {
    result = checkPdfTextDensity(extractedText, pdfPageCount ?? 1);
  } else {
    // Plain text paste — no file structure to inspect
    return { score: 100, issues: [], passed: [], checked: false };
  }

  return checkDateConsistency(extractedText, checkSectionHeaders(extractedText, result));
}
