/**
 * Google Apps Script Web App Client for Sanad App (Multi-Tenant Edition)
 * Manages communication with Google Sheets database and Google Drive file storage,
 * sending shopId with all GET and POST requests for secure multi-tenancy.
 */

import { Customer, CheckItem, CustomerInvoice, ReceivedInvoice, AppSettings, Shop, UserSession } from '../types';
import { getActiveShopId, getCurrentSession, saveStoredShops, setCurrentSession } from './auth';
import { parseAttachments } from '../utils/imageUrl';
import { parseAmount } from '../utils/parseAmount';

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
  if (getCurrentSession()?.localTestOnly) return false;
  const url = getGasApiUrl();
  return Boolean(url && url.startsWith('http'));
};

const expireLocalSession = () => {
  setCurrentSession(null);
  window.dispatchEvent(new CustomEvent('sanad:session-expired'));
};

const reportApiError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  window.dispatchEvent(new CustomEvent('sanad:api-error', { detail: message }));
};

const assertGasResponse = async (response: Response) => {
  if (!response.ok) {
    throw new Error(`خطأ في استجابة الخادم: ${response.status} ${response.statusText}`);
  }
  const result = await response.json();
  if (result.success === false) {
    if (result.code === 'UNAUTHORIZED') expireLocalSession();
    throw new Error(result.error || 'حدث خطأ غير معروف في خادم Apps Script.');
  }
  return result;
};

async function callGasPost<T = any>(action: string, payload: Record<string, any> = {}): Promise<T> {
  const session = getCurrentSession();
  if (session?.localTestOnly) {
    throw new Error('جلسة التجربة المحلية لا يمكنها الاتصال بقاعدة البيانات.');
  }

  const url = getGasApiUrl();
  if (!url) {
    throw new Error('لم يتم تحديد رابط Google Apps Script Web App بعد.');
  }
  if (!session) throw new Error('يلزم تسجيل الدخول قبل تنفيذ هذا الطلب.');
  const currentShopId = payload.ShopID || payload.shopId || getActiveShopId();

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({
        ...payload,
        action,
        ShopID: payload.ShopID || currentShopId,
        shopId: payload.shopId || currentShopId,
        sessionToken: session.token,
      }),
    });
    return await assertGasResponse(response);
  } catch (error) {
    reportApiError(error);
    throw error;
  }
}

export const login = async (
  username: string,
  password: string
): Promise<{ success: boolean; session?: UserSession; error?: string }> => {
  const testUsername = import.meta.env.VITE_LOCAL_TEST_USERNAME;
  const testPassword = import.meta.env.VITE_LOCAL_TEST_PASSWORD;
  if (
    import.meta.env.DEV &&
    testUsername &&
    testPassword &&
    username === testUsername &&
    password === testPassword
  ) {
    const now = Date.now();
    const session: UserSession = {
      sessionId: crypto.randomUUID(),
      userId: 'local-test-user',
      username: testUsername,
      name: 'مستخدم تجريبي',
      shopName: 'متجر تجريبي محلي',
      role: 'shop_user',
      allowedShopIds: ['LOCALTEST'],
      currentShopId: 'LOCALTEST',
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + 6 * 60 * 60 * 1000).toISOString(),
      token: crypto.randomUUID(),
      localTestOnly: true,
    };
    setCurrentSession(session);
    return { success: true, session };
  }

  const url = getGasApiUrl();
  if (!url) return { success: false, error: 'لم يتم إعداد رابط Google Apps Script Web App.' };
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'login', Username: username, Password: password }),
    });
    const result = await assertGasResponse(response);
    const serverSession = result.session;
    const session: UserSession = {
      sessionId: serverSession.sessionId,
      userId: serverSession.userId,
      username: serverSession.username,
      name: serverSession.username,
      shopName: serverSession.shopName || '',
      role: serverSession.role,
      allowedShopIds: serverSession.allowedShopIds,
      currentShopId: serverSession.shopId,
      createdAt: serverSession.createdAt,
      expiresAt: serverSession.expiresAt,
      token: result.token,
    };
    setCurrentSession(session);
    return { success: true, session };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
};

export const logout = () => {
  const session = getCurrentSession();
  setCurrentSession(null);

  if (session && !session.localTestOnly && getGasApiUrl()) {
    void fetch(getGasApiUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'logout', sessionToken: session.token }),
      keepalive: true,
    }).catch((error) => {
      console.warn('Unable to revoke the server session during logout:', error);
    });
  }
};

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
 * Trigger Migration to Multi-Tenant on Google Sheets
 */
export const runMigrationInGas = async (): Promise<{ success: boolean; message: string; logs?: string[] }> => {
  const url = getGasApiUrl();
  if (!url) throw new Error('NO_URL');
  const session = getCurrentSession();
  if (!session) throw new Error('يلزم تسجيل الدخول لتنفيذ الترحيل.');
  const separator = url.includes('?') ? '&' : '?';
  const res = await fetch(`${url}${separator}action=migrate&sessionToken=${encodeURIComponent(session.token)}&_t=${Date.now()}`);
  return assertGasResponse(res);
};

/**
 * Fetch all initial data filtered by active shop from Google Sheets
 */
export const fetchAllDataFromGas = async (shopId: string = getActiveShopId()): Promise<{
  shops: Shop[];
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

  const session = getCurrentSession();
  if (!session) throw new Error('يلزم تسجيل الدخول قبل جلب البيانات.');
  const separator = url.includes('?') ? '&' : '?';
  let json: any;
  try {
    const res = await fetch(
      `${url}${separator}action=getInitialData&shopId=${encodeURIComponent(shopId)}&sessionToken=${encodeURIComponent(session.token)}&_t=${Date.now()}`
    );
    json = await assertGasResponse(res);
  } catch (error) {
    reportApiError(error);
    throw error;
  }
  if (!json.data) throw new Error('فشل في استلام البيانات من Google Sheets');

  const raw = json.data;

  // 1. Process Shops
  let shops: Shop[] = [];
  if (Array.isArray(raw.shops) && raw.shops.length > 0) {
    shops = raw.shops.map((s: any) => ({
      shopId: String(s.ShopID || s.shopId || '').trim().toUpperCase(),
      shopName: String(s.ShopName || s.shopName || s.ShopID || ''),
      contactName: s.ContactName || s.contactName || '',
      phone: String(s.Phone || s.phone || ''),
      email: s.Email || s.email || '',
      status: s.Status === 'inactive' ? 'inactive' : 'active',
      notes: s.Notes || s.notes || '',
      createdAt: s.CreatedAt || s.createdAt || new Date().toISOString(),
    }));
    saveStoredShops(shops);
    const currentSession = getCurrentSession();
    if (currentSession) {
      setCurrentSession({
        ...currentSession,
        allowedShopIds: shops.filter((shop) => shop.status === 'active').map((shop) => shop.shopId),
      });
    }
  } else {
    shops = [];
  }

  // 2. Customers
  const customers: Customer[] = (raw.customers || []).map((c: any) => ({
    id: c.CustomerID || c.id || `cust-${Date.now()}`,
    shopId: c.ShopID || c.shopId || shopId,
    name: c.ShopName || c.name || '',
    contactPerson: c.ContactName || c.contactPerson || '',
    phone: String(c.Phone || c.phone || ''),
    address: c.Address || c.address || '',
    notes: c.Notes || c.notes || '',
    createdAt: c.CreatedAt || c.createdAt || new Date().toISOString(),
  }));

  const customerMap = new Map<string, string>();
  customers.forEach((c) => customerMap.set(c.id, c.name));

  // 3. Customer Invoices
  const invoices: CustomerInvoice[] = (raw.invoices || []).map((inv: any) => {
    const rawImage = inv.InvoiceFile || inv.image || '';
    const attachments = parseAttachments(rawImage);
    return {
      id: inv.InvoiceID || inv.id || `inv-${Date.now()}`,
      shopId: inv.ShopID || inv.shopId || shopId,
      invoiceNumber: inv.InvoiceNumber || inv.invoiceNumber || '',
      customerId: inv.CustomerID || inv.customerId || '',
      customerName: customerMap.get(inv.CustomerID || inv.customerId) || inv.customerName || '',
      amount: Number(inv.Amount || inv.amount) || 0,
      invoiceDate: inv.InvoiceDate || inv.invoiceDate || '',
      receiptStatus: inv.ReceiptStatus || inv.receiptStatus || 'مستحق',
      receiptDate: inv.ReceiptDate || inv.receiptDate || '',
      image: rawImage,
      attachments,
      notes: inv.Notes || inv.notes || '',
      createdAt: inv.CreatedAt || inv.createdAt || new Date().toISOString(),
    };
  });

  const invoiceMap = new Map<string, string>();
  invoices.forEach((i) => invoiceMap.set(i.id, i.invoiceNumber));

  // 4. Checks
  const checks: CheckItem[] = (raw.cheques || []).map((chk: any) => {
    const rawImage = chk.ChequeImage || chk.image || '';
    const attachments = parseAttachments(rawImage);
    return {
      id: chk.ChequeID || chk.id || `chk-${Date.now()}`,
      shopId: chk.ShopID || chk.shopId || shopId,
      checkNumber: chk.ChequeNumber || chk.checkNumber || '',
      customerId: chk.CustomerID || chk.customerId || '',
      customerName: customerMap.get(chk.CustomerID || chk.customerId) || chk.customerName || '',
      amount: Number(chk.Amount || chk.amount) || 0,
      dueDate: chk.DueDate || chk.dueDate || '',
      linkedInvoiceId: chk.InvoiceID || chk.linkedInvoiceId || '',
      linkedInvoiceNumber:
        invoiceMap.get(chk.InvoiceID || chk.linkedInvoiceId) || chk.linkedInvoiceNumber || '',
      image: rawImage,
      attachments,
      notes: chk.Notes || chk.notes || '',
      status: chk.Status || chk.status || 'قادم',
      manualStatus:
        chk.Status === 'مدفوع' || chk.Status === 'cashed'
          ? 'مدفوع'
          : chk.Status === 'ملغي' || chk.Status === 'cancelled'
          ? 'ملغي'
          : undefined,
      cashedDate: chk.PaidDate || chk.cashedDate || '',
      createdAt: chk.CreatedAt || chk.createdAt || new Date().toISOString(),
    };
  });

  // 5. Received Invoices
  const receivedInvoices: ReceivedInvoice[] = (raw.receivedInvoices || []).map((rec: any) => {
    const rawImage = rec.InvoiceFile || rec.image || '';
    const attachments = parseAttachments(rawImage);
    return {
      id: rec.ReceivedInvoiceID || rec.id || `rec-${Date.now()}`,
      shopId: rec.ShopID || rec.shopId || shopId,
      invoiceNumber: rec.InvoiceNumber || rec.invoiceNumber || '',
      sourceName: rec.EntityName || rec.sourceName || '',
      amount: parseAmount(rec.Amount ?? rec.amount),
      invoiceDate: rec.InvoiceDate || rec.invoiceDate || '',
      receiptStatus: rec.ReceiptStatus || rec.receiptStatus || 'لم يتم الاستلام',
      receiptDate: rec.ReceiptDate || rec.receiptDate || '',
      image: rawImage,
      attachments,
      notes: rec.Notes || rec.notes || '',
      createdAt: rec.CreatedAt || rec.createdAt || new Date().toISOString(),
    };
  });

  const settingNumber = (value: unknown, fallback: number) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };
  const settings: AppSettings = {
    reminder1Days: settingNumber(raw.settings?.Reminder1Days, 7),
    reminder2Days: settingNumber(raw.settings?.Reminder2Days, 3),
    reminder3Days: settingNumber(raw.settings?.Reminder3Days, 1),
    reminderToday: settingNumber(raw.settings?.ReminderToday, 0),
    gasWebAppUrl: url,
  };

  return { shops, customers, invoices, checks, receivedInvoices, settings };
};

/**
 * Upload single or multiple files to shop-specific folder in Google Drive
 */
export const uploadFileToDriveApi = async (
  base64Data: string,
  filename: string,
  mimeType: string = 'image/jpeg',
  shopId: string = getActiveShopId()
): Promise<{ fileUrl: string; fileId: string; webViewLink: string; name: string; mimeType: string }> => {
  const result = await callGasPost<{
    success: boolean;
    fileUrl: string;
    fileId: string;
    webViewLink: string;
    name: string;
    mimeType: string;
  }>(
    'uploadFile',
    {
      base64Data,
      filename,
      mimeType,
      ShopID: shopId,
    }
  );

  return {
    fileUrl: result.fileUrl,
    fileId: result.fileId,
    webViewLink: result.webViewLink,
    name: result.name || filename,
    mimeType: result.mimeType || mimeType,
  };
};

export interface UploadFileInput {
  base64Data: string;
  filename: string;
  mimeType: string;
}

export interface UploadedFile {
  fileId: string;
  fileUrl: string;
  webViewLink: string;
  name: string;
  mimeType: string;
}

export const uploadFilesToDriveApi = async (
  files: UploadFileInput[],
  shopId: string = getActiveShopId()
): Promise<UploadedFile[]> => {
  const result = await callGasPost<{ files: UploadedFile[] }>('uploadFiles', {
    ShopID: shopId,
    files,
  });
  return result.files;
};

/**
 * Shops CRUD on Google Sheets
 */
export const createShopInGas = async (shop: Shop, username: string, password: string) => {
  return callGasPost('createShop', {
    ShopID: shop.shopId.toUpperCase(),
    ShopName: shop.shopName,
    Username: username,
    Password: password,
    ContactName: shop.contactName || '',
    Phone: shop.phone || '',
    Email: shop.email || '',
    Status: shop.status,
    Notes: shop.notes || '',
  });
};

export const updateShopInGas = async (shop: Shop) => {
  return callGasPost('updateShop', {
    ShopID: shop.shopId.toUpperCase(),
    ShopName: shop.shopName,
    ContactName: shop.contactName || '',
    Phone: shop.phone || '',
    Email: shop.email || '',
    Status: shop.status,
    Notes: shop.notes || '',
  });
};

export const deleteShopInGas = async (shopId: string) => {
  return callGasPost('deleteShop', { ShopID: shopId.toUpperCase() });
};

export const getUsersFromGas = async () => {
  const url = getGasApiUrl();
  const session = getCurrentSession();
  if (!url || !session) throw new Error('يلزم تسجيل الدخول وإعداد Google Apps Script.');
  const separator = url.includes('?') ? '&' : '?';
  const response = await fetch(
    `${url}${separator}action=getUsers&sessionToken=${encodeURIComponent(session.token)}&_t=${Date.now()}`
  );
  const result = await assertGasResponse(response);
  return result.data;
};

export const setUserShopAccessInGas = async (userId: string, shopIds: string[]) => {
  return callGasPost('setUserShopAccess', { UserID: userId, ShopIDs: shopIds });
};

export const createUserInGas = async (input: {
  username: string;
  password: string;
  role: 'admin' | 'shop_user';
  shopIds?: string[];
  status?: 'active' | 'inactive';
  notes?: string;
}) => {
  return callGasPost('createUser', {
    Username: input.username,
    Password: input.password,
    Role: input.role,
    ShopIDs: input.shopIds || [],
    Status: input.status || 'active',
    Notes: input.notes || '',
  });
};

export const resetUserPasswordInGas = async (userId: string, password: string) => {
  return callGasPost('resetUserPassword', { UserID: userId, Password: password });
};

/**
 * Customer CRUD on Google Sheets
 */
export const createCustomerInGas = async (customer: Customer, shopId: string = getActiveShopId()) => {
  return callGasPost('createCustomer', {
    CustomerID: customer.id,
    ShopID: customer.shopId || shopId,
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
export const createInvoiceInGas = async (inv: CustomerInvoice, shopId: string = getActiveShopId()) => {
  return callGasPost('createInvoice', {
    InvoiceID: inv.id,
    ShopID: inv.shopId || shopId,
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
export const createChequeInGas = async (chk: CheckItem, shopId: string = getActiveShopId()) => {
  return callGasPost('createCheque', {
    ChequeID: chk.id,
    ShopID: chk.shopId || shopId,
    ChequeNumber: chk.checkNumber,
    CustomerID: chk.customerId,
    InvoiceID: chk.linkedInvoiceId || '',
    Amount: chk.amount,
    DueDate: chk.dueDate,
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
export const createReceivedInvoiceInGas = async (rec: ReceivedInvoice, shopId: string = getActiveShopId()) => {
  return callGasPost('createReceivedInvoice', {
    ReceivedInvoiceID: rec.id,
    ShopID: rec.shopId || shopId,
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
