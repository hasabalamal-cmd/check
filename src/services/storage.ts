/**
 * Storage Service for Sanad Multi-Tenant App
 * Manages cache keys isolated by ShopID (e.g. sanad_BUNN_data)
 * and seed data partitioned by ShopID.
 */

import { Customer, CheckItem, CustomerInvoice, ReceivedInvoice, AlertNotification } from '../types';
import { getTodayString, computeCheckStatus } from '../utils/checkCalculations';
import { getActiveShopId } from './auth';

// Helper to generate shop-isolated storage key
export const getShopStorageKey = (prefix: string, shopId: string = getActiveShopId()): string => {
  const safeShopId = (shopId || 'DEFAULT').replace(/[^a-zA-Z0-9_-]/g, '_');
  return `sanad_${safeShopId}_${prefix}_v2`;
};

// Calculate relative date offsets in YYYY-MM-DD
const getDateOffset = (offsetDays: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// Realistic Seed Data per Shop
export const SEED_DATA_MAP: Record<
  string,
  {
    customers: Customer[];
    invoices: CustomerInvoice[];
    checks: CheckItem[];
    receivedInvoices: ReceivedInvoice[];
  }
> = {
  BUNN: {
    customers: [
      {
        id: 'cust-bunn-1',
        shopId: 'BUNN',
        name: 'مؤسسة الأمل للضيافة',
        contactPerson: 'أبو فهد العتيبي',
        phone: '0551234567',
        address: 'الرياض - حي الملز',
        notes: 'توريدات بن ومشروبات ساخنة',
        createdAt: '2026-09-01T10:00:00Z',
      },
      {
        id: 'cust-bunn-2',
        shopId: 'BUNN',
        name: 'كافيه النخبة المتخصص',
        contactPerson: 'م. طارق الزهراني',
        phone: '0509876543',
        address: 'جدة - شارع التحلية',
        notes: 'شحنات شهرية منتظمة',
        createdAt: '2026-09-05T11:30:00Z',
      },
    ],
    invoices: [
      {
        id: 'inv-bunn-101',
        shopId: 'BUNN',
        invoiceNumber: 'BUNN-INV-001',
        customerId: 'cust-bunn-1',
        customerName: 'مؤسسة الأمل للضيافة',
        amount: 4500,
        invoiceDate: getDateOffset(-8),
        notes: 'توريد حبوب بن كولومبي وإثيوبي',
        receiptStatus: 'مستلم',
        receiptDate: getDateOffset(-6),
        createdAt: '2026-09-20T08:00:00Z',
      },
      {
        id: 'inv-bunn-102',
        shopId: 'BUNN',
        invoiceNumber: 'BUNN-INV-002',
        customerId: 'cust-bunn-2',
        customerName: 'كافيه النخبة المتخصص',
        amount: 8200,
        invoiceDate: getDateOffset(-3),
        notes: 'معدات تقطير وبن فاخر',
        receiptStatus: 'مستحق',
        createdAt: '2026-09-26T08:00:00Z',
      },
    ],
    checks: [
      {
        id: 'chk-bunn-1',
        shopId: 'BUNN',
        checkNumber: 'CHK-BN-8801',
        customerId: 'cust-bunn-1',
        customerName: 'مؤسسة الأمل للضيافة',
        amount: 4500,
        dueDate: getDateOffset(4),
        linkedInvoiceId: 'inv-bunn-101',
        linkedInvoiceNumber: 'BUNN-INV-001',
        status: 'upcoming',
        notes: 'شيك الدفعة الأولى',
        createdAt: '2026-09-20T09:00:00Z',
      },
      {
        id: 'chk-bunn-2',
        shopId: 'BUNN',
        checkNumber: 'CHK-BN-8802',
        customerId: 'cust-bunn-2',
        customerName: 'كافيه النخبة المتخصص',
        amount: 4100,
        dueDate: getDateOffset(0), // Today
        linkedInvoiceId: 'inv-bunn-102',
        linkedInvoiceNumber: 'BUNN-INV-002',
        status: 'due_today',
        notes: 'شيك مستحق اليوم لصالح Bunn',
        createdAt: '2026-09-26T10:00:00Z',
      },
    ],
    receivedInvoices: [
      {
        id: 'rec-bunn-1',
        shopId: 'BUNN',
        invoiceNumber: 'SUP-BN-301',
        sourceName: 'شركة حبوب البن الخضراء العالمية',
        amount: 12500,
        invoiceDate: getDateOffset(-12),
        notes: 'استيراد محاصيل بن مجففة',
        receiptStatus: 'تم الاستلام',
        receiptDate: getDateOffset(-10),
        createdAt: '2026-09-18T10:00:00Z',
      },
      {
        id: 'rec-bunn-2',
        shopId: 'BUNN',
        invoiceNumber: 'SUP-BN-302',
        sourceName: 'مصنع الأكواب والأغلفة الحديثة',
        amount: 3400,
        invoiceDate: getDateOffset(-2),
        notes: 'كراتين أكواب ورقية بشعار Bunn',
        receiptStatus: 'لم يتم الاستلام',
        createdAt: '2026-09-27T12:00:00Z',
      },
    ],
  },
  ABC001: {
    customers: [
      {
        id: 'cust-abc-1',
        shopId: 'ABC001',
        name: 'مجموعة التجزئة الحديثة',
        contactPerson: 'فهد السالم',
        phone: '0561112233',
        address: 'الدمام - شارع الملك عبدالعزيز',
        notes: 'عميل رئيسي في فرع ABC',
        createdAt: '2026-09-10T10:00:00Z',
      },
    ],
    invoices: [
      {
        id: 'inv-abc-1',
        shopId: 'ABC001',
        invoiceNumber: 'ABC-INV-901',
        customerId: 'cust-abc-1',
        customerName: 'مجموعة التجزئة الحديثة',
        amount: 15600,
        invoiceDate: getDateOffset(-5),
        notes: 'بضائع استهلاكية متفرقة',
        receiptStatus: 'مستحق',
        createdAt: '2026-09-24T08:00:00Z',
      },
    ],
    checks: [
      {
        id: 'chk-abc-1',
        shopId: 'ABC001',
        checkNumber: 'CHK-ABC-551',
        customerId: 'cust-abc-1',
        customerName: 'مجموعة التجزئة الحديثة',
        amount: 15600,
        dueDate: getDateOffset(7),
        linkedInvoiceId: 'inv-abc-1',
        linkedInvoiceNumber: 'ABC-INV-901',
        status: 'upcoming',
        notes: 'شيك مؤجل لأمر ABC Store',
        createdAt: '2026-09-24T09:00:00Z',
      },
    ],
    receivedInvoices: [
      {
        id: 'rec-abc-1',
        shopId: 'ABC001',
        invoiceNumber: 'REC-ABC-101',
        sourceName: 'مستودعات الشحن السريع ABC',
        amount: 6200,
        invoiceDate: getDateOffset(-4),
        notes: 'شحنة إلكترونيات وتجهيزات',
        receiptStatus: 'لم يتم الاستلام',
        createdAt: '2026-09-25T11:00:00Z',
      },
    ],
  },
  XYZ001: {
    customers: [
      {
        id: 'cust-xyz-1',
        shopId: 'XYZ001',
        name: 'أسواق المدينة العالمية',
        contactPerson: 'عبدالله القحطاني',
        phone: '0544556677',
        address: 'مكة المكرمة - العزيزية',
        notes: 'توريد تموينات دورية',
        createdAt: '2026-09-15T09:00:00Z',
      },
    ],
    invoices: [
      {
        id: 'inv-xyz-1',
        shopId: 'XYZ001',
        invoiceNumber: 'XYZ-INV-441',
        customerId: 'cust-xyz-1',
        customerName: 'أسواق المدينة العالمية',
        amount: 19800,
        invoiceDate: getDateOffset(-6),
        notes: 'دفعة توريد تموينية أولى لـ XYZ',
        receiptStatus: 'مستحق',
        createdAt: '2026-09-23T08:00:00Z',
      },
    ],
    checks: [
      {
        id: 'chk-xyz-1',
        shopId: 'XYZ001',
        checkNumber: 'CHK-XYZ-102',
        customerId: 'cust-xyz-1',
        customerName: 'أسواق المدينة العالمية',
        amount: 19800,
        dueDate: getDateOffset(2),
        linkedInvoiceId: 'inv-xyz-1',
        linkedInvoiceNumber: 'XYZ-INV-441',
        status: 'upcoming',
        notes: 'شيك مؤجل لصالح XYZ Store',
        createdAt: '2026-09-23T10:00:00Z',
      },
    ],
    receivedInvoices: [
      {
        id: 'rec-xyz-1',
        shopId: 'XYZ001',
        invoiceNumber: 'REC-XYZ-701',
        sourceName: 'شركة النقل المبرد اللوجستية',
        amount: 4800,
        invoiceDate: getDateOffset(-5),
        notes: 'أجور نقل برادات للمستودع',
        receiptStatus: 'تم الاستلام',
        receiptDate: getDateOffset(-2),
        createdAt: '2026-09-24T14:00:00Z',
      },
    ],
  },
};

/**
 * Load stored data strictly for a specific shop
 */
export const loadStoredData = (targetShopId: string = getActiveShopId()) => {
  const shopId = targetShopId || 'BUNN';
  const today = getTodayString();
  const defaultSeeds: {
    customers: Customer[];
    invoices: CustomerInvoice[];
    checks: CheckItem[];
    receivedInvoices: ReceivedInvoice[];
  } = {
    customers: [],
    invoices: [],
    checks: [],
    receivedInvoices: [],
  };

  const custKey = getShopStorageKey('customers', shopId);
  const invKey = getShopStorageKey('customer_invoices', shopId);
  const chkKey = getShopStorageKey('checks', shopId);
  const recKey = getShopStorageKey('received_invoices', shopId);
  const notifKey = getShopStorageKey('notifications', shopId);

  // Load Customers
  let customers: Customer[];
  try {
    const raw = localStorage.getItem(custKey);
    customers = raw ? JSON.parse(raw) : defaultSeeds.customers;
  } catch {
    customers = defaultSeeds.customers;
  }

  // Load Customer Invoices
  let customerInvoices: CustomerInvoice[];
  try {
    const raw = localStorage.getItem(invKey);
    customerInvoices = raw ? JSON.parse(raw) : defaultSeeds.invoices;
  } catch {
    customerInvoices = defaultSeeds.invoices;
  }

  // Load Checks & recalculate status based on today
  let checks: CheckItem[];
  try {
    const raw = localStorage.getItem(chkKey);
    const parsed: CheckItem[] = raw ? JSON.parse(raw) : defaultSeeds.checks;
    checks = parsed.map((chk) => ({
      ...chk,
      status: computeCheckStatus(chk, today),
    }));
  } catch {
    checks = defaultSeeds.checks.map((chk) => ({
      ...chk,
      status: computeCheckStatus(chk, today),
    }));
  }

  // Load Received Invoices
  let receivedInvoices: ReceivedInvoice[];
  try {
    const raw = localStorage.getItem(recKey);
    receivedInvoices = raw ? JSON.parse(raw) : defaultSeeds.receivedInvoices;
  } catch {
    receivedInvoices = defaultSeeds.receivedInvoices;
  }

  // Load Notifications
  let notifications: AlertNotification[] = [];
  try {
    const raw = localStorage.getItem(notifKey);
    notifications = raw ? JSON.parse(raw) : [];
  } catch {
    notifications = [];
  }

  return { customers, customerInvoices, checks, receivedInvoices, notifications };
};

export const saveCustomers = (customers: Customer[], shopId: string = getActiveShopId()) => {
  localStorage.setItem(getShopStorageKey('customers', shopId), JSON.stringify(customers));
};

export const saveChecks = (checks: CheckItem[], shopId: string = getActiveShopId()) => {
  localStorage.setItem(getShopStorageKey('checks', shopId), JSON.stringify(checks));
};

export const saveCustomerInvoices = (invoices: CustomerInvoice[], shopId: string = getActiveShopId()) => {
  localStorage.setItem(getShopStorageKey('customer_invoices', shopId), JSON.stringify(invoices));
};

export const saveReceivedInvoices = (invoices: ReceivedInvoice[], shopId: string = getActiveShopId()) => {
  localStorage.setItem(getShopStorageKey('received_invoices', shopId), JSON.stringify(invoices));
};

export const saveNotifications = (notifications: AlertNotification[], shopId: string = getActiveShopId()) => {
  localStorage.setItem(getShopStorageKey('notifications', shopId), JSON.stringify(notifications));
};

export const resetToSeedData = (shopId: string = getActiveShopId()) => {
  return loadStoredData(shopId);
};
