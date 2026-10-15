export const MAX_SCREENSHOTS = 20;
const MAX_SCREENSHOT_BYTES = 10 * 1024 * 1024;
const SCREENSHOT_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.tif',
  '.tiff',
  '.bmp',
  '.webp',
  '.gif',
]);
export const SCREENSHOT_ACCEPT =
  'image/png,image/jpeg,image/tiff,image/bmp,image/webp,image/gif,.png,.jpg,.jpeg,.tif,.tiff,.bmp,.webp,.gif';
export const BIBLIOGRAPHY_FILE_EXTENSIONS = new Set(['bib', 'bibtex', 'json', 'ris', 'csv']);
export const BIBLIOGRAPHY_FILE_ACCEPT = '.bib,.bibtex,.json,.ris,.csv';

export const REPLACE_CONFIRM =
  'Replace the seed bibliography? The previous list will be deleted and disclosure will be recomputed.';

export function fileExtension(name) {
  const base = String(name || '');
  const idx = base.lastIndexOf('.');
  if (idx < 0) return '';
  return base.slice(idx + 1).toLowerCase();
}

function screenshotExtension(name) {
  const base = String(name || '');
  const idx = base.lastIndexOf('.');
  if (idx < 0) return '';
  return base.slice(idx).toLowerCase();
}

export function validateScreenshot(file) {
  const ext = screenshotExtension(file?.name);
  if (!SCREENSHOT_EXTENSIONS.has(ext)) {
    return `"${file?.name || 'File'}" has an unsupported type. Allowed: PNG, JPG, JPEG, TIF, TIFF, BMP, WEBP, GIF.`;
  }
  if (!file.size || file.size <= 0) {
    return `"${file.name}" is empty.`;
  }
  if (file.size > MAX_SCREENSHOT_BYTES) {
    return `"${file.name}" exceeds the 10 MB size limit.`;
  }
  return null;
}
