const RECEIVED_STATUSES = new Set([
  'received',
  'تم الاستلام',
  'مستلم',
  'مستلمة',
]);

export const isReceiptReceived = (status: string | null | undefined): boolean =>
  RECEIVED_STATUSES.has(String(status || '').trim().toLowerCase());
