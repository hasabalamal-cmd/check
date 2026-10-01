/**
 * Helper utility to normalize and format image URLs and attachments,
 * with support for Google Drive file links, thumbnails, PDFs, base64 data URLs,
 * and multiple attachments.
 */

import { Attachment } from '../types';

export interface GoogleDriveUrlInfo {
  isGoogleDrive: boolean;
  isPdf: boolean;
  fileId: string | null;
  displayUrl: string;
  originalUrl: string;
  downloadUrl: string;
  viewUrl: string;
}

/**
 * Extracts Google Drive file ID from various link formats
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
 * Checks if a URL or filename indicates a PDF
 */
export function isPdfUrl(url: string, name?: string): boolean {
  if (!url && !name) return false;
  const target = `${name || ''} ${url || ''}`.toLowerCase();
  return target.includes('.pdf') || target.includes('application/pdf');
}

/**
 * Formats any URL into safe display, download, and fallback URLs
 */
export function resolveImageUrl(url: string, size: number = 2000, name?: string): GoogleDriveUrlInfo {
  if (!url || typeof url !== 'string') {
    return {
      isGoogleDrive: false,
      isPdf: false,
      fileId: null,
      displayUrl: '',
      originalUrl: '',
      downloadUrl: '',
      viewUrl: '',
    };
  }

  const trimmed = url.trim();
  const fileId = extractGoogleDriveFileId(trimmed);
  const isPdf = isPdfUrl(trimmed, name);

  if (fileId && (trimmed.includes('drive.google.com') || trimmed.includes('docs.google.com'))) {
    return {
      isGoogleDrive: true,
      isPdf,
      fileId,
      displayUrl: isPdf
        ? `https://drive.google.com/file/d/${fileId}/preview`
        : `https://drive.google.com/thumbnail?id=${fileId}&sz=w${size}`,
      originalUrl: trimmed,
      downloadUrl: `https://drive.google.com/uc?export=download&id=${fileId}`,
      viewUrl: `https://drive.google.com/file/d/${fileId}/view?usp=sharing`,
    };
  }

  return {
    isGoogleDrive: false,
    isPdf,
    fileId: null,
    displayUrl: trimmed,
    originalUrl: trimmed,
    downloadUrl: trimmed,
    viewUrl: trimmed,
  };
}

/**
 * Parses an image field from Google Sheets or state into an array of Attachment objects.
 * Handles:
 * 1. JSON array string: '[{"name":"...","url":"..."}]' or '["url1","url2"]'
 * 2. Comma or newline separated URLs: 'url1, url2'
 * 3. Single URL or base64 string
 */
export function parseAttachments(raw: string | Attachment[] | undefined | null): Attachment[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;

  if (typeof raw !== 'string') return [];
  const trimmed = raw.trim();
  if (!trimmed) return [];

  // Try JSON parse
  if ((trimmed.startsWith('[') && trimmed.endsWith(']')) || (trimmed.startsWith('{') && trimmed.endsWith('}'))) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map((item, idx) => {
          if (typeof item === 'string') {
            return {
              id: `att-${idx}`,
              name: `مرفق ${idx + 1}`,
              url: item,
            };
          }
          return {
            id: item.id || `att-${idx}`,
            name: item.name || `مرفق ${idx + 1}`,
            url: item.url || '',
            fileId: item.fileId,
            mimeType: item.mimeType,
          };
        }).filter((att) => Boolean(att.url));
      } else if (typeof parsed === 'object' && parsed !== null && parsed.url) {
        return [{
          id: parsed.id || 'att-0',
          name: parsed.name || 'مرفق 1',
          url: parsed.url,
          fileId: parsed.fileId,
          mimeType: parsed.mimeType,
        }];
      }
    } catch {
      // Ignore JSON error and fall through
    }
  }

  // Handle pipe or newline separated URLs
  if (trimmed.includes('\n') || trimmed.includes('|')) {
    const parts = trimmed.split(/[\n|]+/).map((s) => s.trim()).filter(Boolean);
    return parts.map((url, idx) => ({
      id: `att-${idx}`,
      name: `مرفق ${idx + 1}`,
      url,
    }));
  }

  // Single URL or Base64 string
  return [
    {
      id: 'att-0',
      name: isPdfUrl(trimmed) ? 'مستند PDF' : 'مستند / صورة',
      url: trimmed,
    },
  ];
}

/**
 * Serializes an array of attachments into a string for storage in Google Sheets
 */
export function serializeAttachments(attachments: Attachment[]): string {
  if (!attachments || attachments.length === 0) return '';
  if (attachments.length === 1 && !attachments[0].name.includes('.pdf')) {
    return attachments[0].url;
  }
  return JSON.stringify(attachments);
}
