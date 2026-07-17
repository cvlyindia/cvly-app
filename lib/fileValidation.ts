// Vercel's serverless functions have a hard 4.5MB request body limit at the
// platform level - no code in our own routes can raise this, and a file over
// it gets rejected before our route even runs, sometimes with a non-JSON error
// body that a naive res.json() call chokes on. 4MB leaves comfortable headroom
// for multipart form overhead so a real resume-sized file never gets close.
export const MAX_UPLOAD_SIZE_BYTES = 4 * 1024 * 1024;

const ACCEPTED_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'image/jpeg',
  'image/png',
]);

const ACCEPTED_EXTENSIONS = ['.pdf', '.docx', '.txt', '.jpg', '.jpeg', '.png'];

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

/** Validated client-side, before any upload is attempted, so the message is
 * immediate and specific rather than a confusing failure after the fact. */
export function validateResumeFile(file: File): FileValidationResult {
  if (file.size > MAX_UPLOAD_SIZE_BYTES) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    return { valid: false, error: `That file is ${sizeMB}MB — please keep uploads under 4MB. A real resume is almost never this large; try re-exporting or compressing it.` };
  }

  const typeOk = ACCEPTED_TYPES.has(file.type);
  const extensionOk = ACCEPTED_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext));
  if (!typeOk && !extensionOk) {
    return { valid: false, error: 'Please upload a PDF, DOCX, TXT, or a photo (JPG/PNG) of your resume.' };
  }

  return { valid: true };
}
