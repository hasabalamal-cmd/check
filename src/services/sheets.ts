import { Customer, CheckItem, CustomerInvoice, ReceivedInvoice } from '../types';
import { CHECK_STATUS_CONFIG } from '../utils/checkCalculations';

export interface ExportToSheetsResult {
  spreadsheetId: string;
  spreadsheetUrl: string;
}

/**
 * Creates a formatted Google Spreadsheet containing all tables:
 * - العملاء والمحلات
 * - شيكات العملاء
 * - فواتير العملاء
 * - الفواتير المستلمة
 */
export const exportDataToGoogleSheets = async (
  accessToken: string,
  data: {
    customers: Customer[];
    checks: CheckItem[];
    customerInvoices: CustomerInvoice[];
    receivedInvoices: ReceivedInvoice[];
  }
): Promise<ExportToSheetsResult> => {
  const currentDate = new Date().toLocaleDateString('ar-SA');
  const title = `سند - إدارة الشيكات والفواتير (${currentDate})`;

  // Step 1: Create spreadsheet with 4 sheet tabs
  const createPayload = {
    properties: {
      title,
      locale: 'ar_SA',
      timeZone: 'Asia/Riyadh',
    },
    sheets: [
      { properties: { title: 'العملاء والمحلات', rightToLeft: true } },
      { properties: { title: 'شيكات العملاء', rightToLeft: true } },
      { properties: { title: 'فواتير العملاء', rightToLeft: true } },
      { properties: { title: 'الفواتير المستلمة', rightToLeft: true } },
    ],
  };

  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(createPayload),
  });

  if (!createRes.ok) {
    const errorJson = await createRes.json().catch(() => ({}));
    throw new Error(errorJson?.error?.message || 'فشل في إنشاء جدول Google Sheets');
  }

  const sheetData = await createRes.json();
  const spreadsheetId = sheetData.spreadsheetId;
  const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  // Step 2: Prepare rows for each sheet
  const customersRows = [
    ['اسم المحل', 'اسم المسؤول', 'رقم الجوال', 'العنوان', 'ملاحظات', 'تاريخ الإضافة'],
    ...data.customers.map((c) => [
      c.name,
      c.contactPerson,
      c.phone,
      c.address,
      c.notes || '',
      c.createdAt.split('T')[0],
    ]),
  ];

  const checksRows = [
    ['رقم الشيك', 'اسم المحل', 'المبلغ (ر.س)', 'تاريخ الاستحقاق', 'الحالة', 'الفاتورة المرتبطة', 'اسم البنك', 'ملاحظات'],
    ...data.checks.map((chk) => [
      chk.checkNumber,
      chk.customerName,
      chk.amount,
      chk.dueDate,
      CHECK_STATUS_CONFIG[chk.status]?.label || chk.status,
      chk.linkedInvoiceNumber || 'غير مرتبط',
      chk.bankName || '',
      chk.notes || '',
    ]),
  ];

  const customerInvoicesRows = [
    ['رقم الفاتورة', 'اسم المحل', 'مبلغ الفاتورة (ر.س)', 'تاريخ الفاتورة', 'ملاحظات'],
    ...data.customerInvoices.map((inv) => [
      inv.invoiceNumber,
      inv.customerName,
      inv.amount,
      inv.invoiceDate,
      inv.notes || '',
    ]),
  ];

  const receivedInvoicesRows = [
    ['رقم الفاتورة', 'اسم الجهة', 'مبلغ الفاتورة (ر.س)', 'تاريخ الفاتورة', 'حالة الاستلام', 'ملاحظات'],
    ...data.receivedInvoices.map((rinv) => [
      rinv.invoiceNumber,
      rinv.sourceName,
      rinv.amount,
      rinv.invoiceDate,
      rinv.receiptStatus === 'received' ? 'تم الاستلام' : 'لم يتم الاستلام',
      rinv.notes || '',
    ]),
  ];

  // Step 3: Populate data using batchUpdate values
  const batchUpdateValuesPayload = {
    valueInputOption: 'USER_ENTERED',
    data: [
      {
        range: "'العملاء والمحلات'!A1",
        values: customersRows,
      },
      {
        range: "'شيكات العملاء'!A1",
        values: checksRows,
      },
      {
        range: "'فواتير العملاء'!A1",
        values: customerInvoicesRows,
      },
      {
        range: "'الفواتير المستلمة'!A1",
        values: receivedInvoicesRows,
      },
    ],
  };

  const updateRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(batchUpdateValuesPayload),
    }
  );

  if (!updateRes.ok) {
    const errorJson = await updateRes.json().catch(() => ({}));
    throw new Error(errorJson?.error?.message || 'فشل في تعبئة بيانات Google Sheets');
  }

  return { spreadsheetId, spreadsheetUrl };
};
