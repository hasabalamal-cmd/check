/**
 * Google Apps Script Web App Client for Sanad App
 * Manages communication with Google Sheets database and Google Drive file storage
 */

import { Customer, CheckItem, CustomerInvoice, ReceivedInvoice, AppSettings } from '../types';

const GAS_API_URL_KEY = 'sanad_gas_api_url';

export const getGasApiUrl = (): string => {
  const customUrl = localStorage.getItem(GAS_API_URL_KEY);
  if (customUrl && customUrl.trim()) {
    return customUrl.trim();
  }
  return (import.meta.env.VITE_GAS_API_URL || '').trim();
};

export const setGasApiUrl = (url: string) => {
  if (!url || !url.trim()) {
    localStorage.removeItem(GAS_API_URL_KEY);
  } else {
    localStorage.setItem(GAS_API_URL_KEY, url.trim());
  }
};

export const isGasConfigured = (): boolean => {
  const url = getGasApiUrl();
  return Boolean(url && url.startsWith('http'));
};

/**
 * Execute a POST request to Google Apps Script.
 * Using Content-Type 'text/plain;charset=utf-8' prevents CORS preflight (OPTIONS)
 * which Google Apps Script Web Apps do not respond to natively.
 */
async function callGasPost<T = any>(action: string, payload: Record<string, any> = {}): Promise<T> {
  const url = getGasApiUrl();
  if (!url) {
    throw new Error('لم يتم تحديد رابط Google Apps Script Web App بعد.');
  }

  const bodyData = {
    action,
    ...payload,
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
    },
    body: JSON.stringify(bodyData),
  });

  if (!response.ok) {
    throw new Error(`خطأ في استجابة الخادم: ${response.status} ${response.statusText}`);
  }

  const result = await response.json();
  if (result.success === false) {
    throw new Error(result.error || 'حدث خطأ غير معروف في خادم Apps Script.');
  }

  return result;
}

/**
 * Test connectivity with Google Apps Script Web App
 */
export const testGasConnection = async (targetUrl?: string): Promise<{ success: boolean; message: string }> => {
  const url = targetUrl || getGasApiUrl();
  if (!url) {
    return { success: false, message: 'الرجاء إدخال رابط Web App أولاً.' };
  }

  try {
    const separator = url.includes('?') ? '&' : '?';
    const testUrl = `${url}${separator}action=ping&_t=${Date.now()}`;
    const res = await fetch(testUrl);
    if (!res.ok) {
      return { success: false, message: `فشل الاتصال: رمز الخطأ ${res.status}` };
    }
    const data = await res.json();
    if (data.success) {
      return { success: true, message: data.message || 'تم الاتصال بقاعدة بيانات Google Sheets بنجاح!' };
    }
    return { success: false, message: data.error || 'استجابة غير صالحة من السكريبت.' };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'تعذر الوصول إلى الرابط. تأكد من نشر الـ Web App مع إتاحة الوصول لـ (Anyone).',
    };
  }
};

/**
 * Fetch all initial data from Google Sheets in a single request
 */
export const fetchAllDataFromGas = async (): Promise<{
  customers: Customer[];
  invoices: CustomerInvoice[];
  checks: CheckItem[];
  receivedInvoices: ReceivedInvoice[];
  settings: AppSettings;
}> => {
  const url = getGasApiUrl();
  if (!url) {
    throw new Error('NO_URL');
  }

  const separator = url.includes('?') ? '&' : '?';
  const res = await fetch(`${url}${separator}action=getInitialData&_t=${Date.now()}`);
  if (!res.ok) {
    throw new Error(`فشل جلب البيانات: ${res.status}`);
  }

  const json = await res.json();
  if (!json.success || !json.data) {
    throw new Error(json.error || 'فشل في استلام البيانات من Google Sheets');
  }

  const raw = json.data;

  // Map sheet rows to strongly typed models
  const customers: Customer[] = (raw.customers || []).map((c: any) => ({
    id: c.CustomerID || c.id || `cust-${Date.now()}`,
    name: c.ShopName || c.name || '',
    contactPerson: c.ContactName || c.contactPerson || '',
    phone: String(c.Phone || c.phone || ''),
    address: c.Address || c.address || '',
    notes: c.Notes || c.notes || '',
    createdAt: c.CreatedAt || c.createdAt || new Date().toISOString(),
  }));

  const customerMap = new Map<string, string>();
  customers.forEach((c) => customerMap.set(c.id, c.name));

  const invoices: CustomerInvoice[] = (raw.invoices || []).map((inv: any) => ({
    id: inv.InvoiceID || inv.id || `inv-${Date.now()}`,
    invoiceNumber: inv.InvoiceNumber || inv.invoiceNumber || '',
    customerId: inv.CustomerID || inv.customerId || '',
    customerName: customerMap.get(inv.CustomerID || inv.customerId) || inv.customerName || '',
    amount: Number(inv.Amount || inv.amount) || 0,
    invoiceDate: inv.InvoiceDate || inv.invoiceDate || '',
    receiptStatus: inv.ReceiptStatus || inv.receiptStatus || 'مستحق',
    receiptDate: inv.ReceiptDate || inv.receiptDate || '',
    image: inv.InvoiceFile || inv.image || '',
    notes: inv.Notes || inv.notes || '',
    createdAt: inv.CreatedAt || inv.createdAt || new Date().toISOString(),
  }));

  const invoiceMap = new Map<string, string>();
  invoices.forEach((i) => invoiceMap.set(i.id, i.invoiceNumber));

  const checks: CheckItem[] = (raw.cheques || []).map((chk: any) => ({
    id: chk.ChequeID || chk.id || `chk-${Date.now()}`,
    checkNumber: chk.ChequeNumber || chk.checkNumber || '',
    customerId: chk.CustomerID || chk.customerId || '',
    customerName: customerMap.get(chk.CustomerID || chk.customerId) || chk.customerName || '',
    amount: Number(chk.Amount || chk.amount) || 0,
    dueDate: chk.DueDate || chk.dueDate || '',
    linkedInvoiceId: chk.InvoiceID || chk.linkedInvoiceId || '',
    linkedInvoiceNumber:
      invoiceMap.get(chk.InvoiceID || chk.linkedInvoiceId) || chk.linkedInvoiceNumber || '',
    bankName: chk.Bank || chk.bankName || '',
    image: chk.ChequeImage || chk.image || '',
    notes: chk.Notes || chk.notes || '',
    status: chk.Status || chk.status || 'قادم',
    manualStatus: chk.Status === 'مدفوع' || chk.Status === 'cashed' ? 'مدفوع' : chk.Status === 'ملغي' || chk.Status === 'cancelled' ? 'ملغي' : undefined,
    cashedDate: chk.PaidDate || chk.cashedDate || '',
    createdAt: chk.CreatedAt || chk.createdAt || new Date().toISOString(),
  }));

  const receivedInvoices: ReceivedInvoice[] = (raw.receivedInvoices || []).map((rec: any) => ({
    id: rec.ReceivedInvoiceID || rec.id || `rec-${Date.now()}`,
    invoiceNumber: rec.InvoiceNumber || rec.invoiceNumber || '',
    sourceName: rec.EntityName || rec.sourceName || '',
    amount: Number(rec.Amount || rec.amount) || 0,
    invoiceDate: rec.InvoiceDate || rec.invoiceDate || '',
    receiptStatus: rec.ReceiptStatus || rec.receiptStatus || 'لم يتم الاستلام',
    receiptDate: rec.ReceiptDate || rec.receiptDate || '',
    image: rec.InvoiceFile || rec.image || '',
    notes: rec.Notes || rec.notes || '',
    createdAt: rec.CreatedAt || rec.createdAt || new Date().toISOString(),
  }));

  const settings: AppSettings = {
    reminder1Days: Number(raw.settings?.Reminder1Days) || 7,
    reminder2Days: Number(raw.settings?.Reminder2Days) || 3,
    reminder3Days: Number(raw.settings?.Reminder3Days) || 1,
    reminderToday: Number(raw.settings?.ReminderToday) || 0,
    gasWebAppUrl: url,
  };

  return { customers, invoices, checks, receivedInvoices, settings };
};

/**
 * Upload an image or document to Google Drive via Apps Script API
 */
export const uploadFileToDriveApi = async (
  base64Data: string,
  filename: string,
  mimeType: string = 'image/jpeg'
): Promise<{ fileUrl: string; fileId: string }> => {
  const result = await callGasPost<{ success: boolean; fileUrl: string; fileId: string }>('uploadFile', {
    base64Data,
    filename,
    mimeType,
  });

  return { fileUrl: result.fileUrl, fileId: result.fileId };
};

/**
 * Customer CRUD on Google Sheets
 */
export const createCustomerInGas = async (customer: Customer) => {
  return callGasPost('createCustomer', {
    CustomerID: customer.id,
    ShopName: customer.name,
    ContactName: customer.contactPerson,
    Phone: customer.phone,
    Address: customer.address,
    Notes: customer.notes || '',
    CreatedAt: customer.createdAt,
  });
};

export const updateCustomerInGas = async (customer: Customer) => {
  return callGasPost('updateCustomer', {
    CustomerID: customer.id,
    ShopName: customer.name,
    ContactName: customer.contactPerson,
    Phone: customer.phone,
    Address: customer.address,
    Notes: customer.notes || '',
  });
};

export const deleteCustomerInGas = async (customerId: string) => {
  return callGasPost('deleteCustomer', { CustomerID: customerId });
};

/**
 * Invoices CRUD on Google Sheets
 */
export const createInvoiceInGas = async (inv: CustomerInvoice) => {
  return callGasPost('createInvoice', {
    InvoiceID: inv.id,
    InvoiceNumber: inv.invoiceNumber,
    CustomerID: inv.customerId,
    InvoiceDate: inv.invoiceDate,
    Amount: inv.amount,
    ReceiptStatus: inv.receiptStatus || 'مستحق',
    ReceiptDate: inv.receiptDate || '',
    InvoiceFile: inv.image || '',
    Notes: inv.notes || '',
    CreatedAt: inv.createdAt,
  });
};

export const updateInvoiceInGas = async (inv: CustomerInvoice) => {
  return callGasPost('updateInvoice', {
    InvoiceID: inv.id,
    InvoiceNumber: inv.invoiceNumber,
    CustomerID: inv.customerId,
    InvoiceDate: inv.invoiceDate,
    Amount: inv.amount,
    ReceiptStatus: inv.receiptStatus || 'مستحق',
    ReceiptDate: inv.receiptDate || '',
    InvoiceFile: inv.image || '',
    Notes: inv.notes || '',
  });
};

export const deleteInvoiceInGas = async (invoiceId: string) => {
  return callGasPost('deleteInvoice', { InvoiceID: invoiceId });
};

/**
 * Cheques CRUD on Google Sheets
 */
export const createChequeInGas = async (chk: CheckItem) => {
  return callGasPost('createCheque', {
    ChequeID: chk.id,
    ChequeNumber: chk.checkNumber,
    CustomerID: chk.customerId,
    InvoiceID: chk.linkedInvoiceId || '',
    Amount: chk.amount,
    DueDate: chk.dueDate,
    Bank: chk.bankName || '',
    ChequeImage: chk.image || '',
    Notes: chk.notes || '',
    Status: chk.status,
    PaidDate: chk.cashedDate || '',
    CreatedAt: chk.createdAt,
  });
};

export const updateChequeInGas = async (chk: CheckItem) => {
  return callGasPost('updateCheque', {
    ChequeID: chk.id,
    ChequeNumber: chk.checkNumber,
    CustomerID: chk.customerId,
    InvoiceID: chk.linkedInvoiceId || '',
    Amount: chk.amount,
    DueDate: chk.dueDate,
    Bank: chk.bankName || '',
    ChequeImage: chk.image || '',
    Notes: chk.notes || '',
    Status: chk.status,
    PaidDate: chk.cashedDate || '',
  });
};

export const updateChequeStatusInGas = async (chequeId: string, status: string, paidDate?: string) => {
  return callGasPost('updateChequeStatus', {
    ChequeID: chequeId,
    Status: status,
    PaidDate: paidDate || (status === 'مدفوع' ? new Date().toISOString().split('T')[0] : ''),
  });
};

export const deleteChequeInGas = async (chequeId: string) => {
  return callGasPost('deleteCheque', { ChequeID: chequeId });
};

/**
 * Received Invoices CRUD on Google Sheets
 */
export const createReceivedInvoiceInGas = async (rec: ReceivedInvoice) => {
  return callGasPost('createReceivedInvoice', {
    ReceivedInvoiceID: rec.id,
    InvoiceNumber: rec.invoiceNumber,
    EntityName: rec.sourceName,
    Amount: rec.amount,
    InvoiceDate: rec.invoiceDate,
    ReceiptStatus: rec.receiptStatus,
    ReceiptDate: rec.receiptDate || '',
    InvoiceFile: rec.image || '',
    Notes: rec.notes || '',
    CreatedAt: rec.createdAt,
  });
};

export const updateReceivedInvoiceInGas = async (rec: ReceivedInvoice) => {
  return callGasPost('updateReceivedInvoice', {
    ReceivedInvoiceID: rec.id,
    InvoiceNumber: rec.invoiceNumber,
    EntityName: rec.sourceName,
    Amount: rec.amount,
    InvoiceDate: rec.invoiceDate,
    ReceiptStatus: rec.receiptStatus,
    ReceiptDate: rec.receiptDate || '',
    InvoiceFile: rec.image || '',
    Notes: rec.notes || '',
  });
};

export const updateReceivedInvoiceStatusInGas = async (
  receivedInvoiceId: string,
  receiptStatus: string,
  receiptDate?: string
) => {
  return callGasPost('updateReceivedInvoiceStatus', {
    ReceivedInvoiceID: receivedInvoiceId,
    ReceiptStatus: receiptStatus,
    ReceiptDate: receiptDate || (receiptStatus === 'تم الاستلام' ? new Date().toISOString().split('T')[0] : ''),
  });
};

export const deleteReceivedInvoiceInGas = async (receivedInvoiceId: string) => {
  return callGasPost('deleteReceivedInvoice', { ReceivedInvoiceID: receivedInvoiceId });
};

/**
 * Trigger backend check of reminders
 */
export const triggerServerRemindersScan = async () => {
  const url = getGasApiUrl();
  if (!url) return null;
  const separator = url.includes('?') ? '&' : '?';
  const res = await fetch(`${url}${separator}action=checkReminders&_t=${Date.now()}`);
  return res.json();
};

/**
 * Bulk sync seed data to Google Sheets (when first connecting an empty sheet)
 */
export const syncSeedDataToGas = async (data: {
  customers: Customer[];
  invoices: CustomerInvoice[];
  cheques: CheckItem[];
  receivedInvoices: ReceivedInvoice[];
}) => {
  return callGasPost('syncSeedData', data);
};
