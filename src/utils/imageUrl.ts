/**
 * Helper utility to normalize and format image URLs,
 * with special support for Google Drive file links, thumbnails, base64 data URLs,
 * and regular web image URLs.
 */

export interface GoogleDriveUrlInfo {
  isGoogleDrive: boolean;
  fileId: string | null;
  displayUrl: string;
  originalUrl: string;
  downloadUrl: string;
  viewUrl: string;
}

/**
 * Extracts Google Drive file ID from various link formats:
 * - https://drive.google.com/uc?export=view&id=FILE_ID
 * - https://drive.google.com/uc?id=FILE_ID
 * - https://drive.google.com/open?id=FILE_ID
 * - https://drive.google.com/file/d/FILE_ID/view
 * - https://drive.google.com/file/d/FILE_ID/edit
 * - https://drive.google.com/file/d/FILE_ID
 * - https://drive.google.com/thumbnail?id=FILE_ID
 * - drive.google.com/...
 */
export function extractGoogleDriveFileId(url: string): string | null {
  if (!url || typeof url !== 'string') return null;

  const trimmed = url.trim();

  // Pattern 1: id=FILE_ID or id=FILE_ID&...
  const idParamMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/i);
  if (idParamMatch && idParamMatch[1]) {
    return idParamMatch[1];
  }

  // Pattern 2: /file/d/FILE_ID/...
  const fileDMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/i);
  if (fileDMatch && fileDMatch[1]) {
    return fileDMatch[1];
  }

  // Pattern 3: /d/FILE_ID/...
  const dMatch = trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/i);
  if (dMatch && dMatch[1]) {
    return dMatch[1];
  }

  return null;
}

/**
 * Formats any URL into safe display, download, and fallback URLs
 */
export function resolveImageUrl(url: string, size: number = 2000): GoogleDriveUrlInfo {
  if (!url || typeof url !== 'string') {
    return {
      isGoogleDrive: false,
      fileId: null,
      displayUrl: '',
      originalUrl: '',
      downloadUrl: '',
      viewUrl: '',
    };
  }

  const trimmed = url.trim();
  const fileId = extractGoogleDriveFileId(trimmed);

  if (fileId && (trimmed.includes('drive.google.com') || trimmed.includes('docs.google.com'))) {
    return {
      isGoogleDrive: true,
      fileId,
      // Google Drive thumbnail endpoint reliably renders JPG, JPEG, PNG, WEBP, GIF in <img> tags
      displayUrl: `https://drive.google.com/thumbnail?id=${fileId}&sz=w${size}`,
      originalUrl: trimmed,
      downloadUrl: `https://drive.google.com/uc?export=download&id=${fileId}`,
      viewUrl: `https://drive.google.com/file/d/${fileId}/view?usp=sharing`,
    };
  }

  return {
    isGoogleDrive: false,
    fileId: null,
    displayUrl: trimmed,
    originalUrl: trimmed,
    downloadUrl: trimmed,
    viewUrl: trimmed,
  };
}
