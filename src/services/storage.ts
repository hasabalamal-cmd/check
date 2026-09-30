import { Customer, CheckItem, CustomerInvoice, ReceivedInvoice, AlertNotification } from '../types';
import { getTodayString, computeCheckStatus } from '../utils/checkCalculations';

const CUSTOMERS_KEY = 'sanad_customers_v1';
const CHECKS_KEY = 'sanad_checks_v1';
const CUSTOMER_INVOICES_KEY = 'sanad_customer_invoices_v1';
const RECEIVED_INVOICES_KEY = 'sanad_received_invoices_v1';
const NOTIFICATIONS_KEY = 'sanad_notifications_v1';

// Calculate relative date offsets in YYYY-MM-DD
const getDateOffset = (offsetDays: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// Initial realistic Arabic seed data
export const INITIAL_CUSTOMERS: Customer[] = [
  {
    id: 'cust-1',
    name: 'مؤسسة الأمل التجارية',
    contactPerson: 'أبو فهد العتيبي',
    phone: '0551234567',
    address: 'الرياض - حي الملز، طريق صلاح الدين',
    notes: 'عميل ممتاز وملتزم بالدفعات الشهرية، خصم خاص 5% للبضائع الغذائية',
    createdAt: '2026-09-01T10:00:00Z',
  },
  {
    id: 'cust-2',
    name: 'شركة الوفاق للتوريدات',
    contactPerson: 'م. طارق الزهراني',
    phone: '0509876543',
    address: 'جدة - حي الصفا، شارع الأربعين',
    notes: 'استلام البضائع يوم الأحد أسبوعياً، شيكات آجلة 30 يوماً',
    createdAt: '2026-09-05T11:30:00Z',
  },
  {
    id: 'cust-3',
    name: 'سوبرماركت البركة المركزي',
    contactPerson: 'سلمان الدوسري',
    phone: '0543322110',
    address: 'الدمام - حي الشاطئ، تقاطع الملك فهد',
    notes: 'فرع رئيسي يتعامل بالشيكات المعتمدة',
    createdAt: '2026-09-10T09:15:00Z',
  },
  {
    id: 'cust-4',
    name: 'ركن النخبة للمواد الاستهلاكية',
    contactPerson: 'خالد المطيري',
    phone: '0567788990',
    address: 'المدينة المنورة - حي سلطانة',
    notes: 'تسليم في المستودع الميداني',
    createdAt: '2026-09-15T14:20:00Z',
  },
];

export const INITIAL_CUSTOMER_INVOICES: CustomerInvoice[] = [
  {
    id: 'cinv-101',
    invoiceNumber: 'INV-2026-089',
    customerId: 'cust-1',
    customerName: 'مؤسسة الأمل التجارية',
    amount: 15000,
    invoiceDate: getDateOffset(-10),
    notes: 'توريد دفعة مواد غذائية أولى - شحنة رقم 42',
    createdAt: '2026-09-19T08:00:00Z',
  },
  {
    id: 'cinv-102',
    invoiceNumber: 'INV-2026-090',
    customerId: 'cust-2',
    customerName: 'شركة الوفاق للتوريدات',
    amount: 25000,
    invoiceDate: getDateOffset(-5),
    notes: 'توريد كراتين زيت وعصائر - معتمدة من الإدارة',
    createdAt: '2026-09-24T08:00:00Z',
  },
  {
    id: 'cinv-103',
    invoiceNumber: 'INV-2026-091',
    customerId: 'cust-3',
    customerName: 'سوبرماركت البركة المركزي',
    amount: 18500,
    invoiceDate: getDateOffset(-2),
    notes: 'توريد مستلزمات منظفات ومعلبات',
    createdAt: '2026-09-27T08:00:00Z',
  },
  {
    id: 'cinv-104',
    invoiceNumber: 'INV-2026-092',
    customerId: 'cust-4',
    customerName: 'ركن النخبة للمواد الاستهلاكية',
    amount: 32000,
    invoiceDate: getDateOffset(-15),
    notes: 'شحنة بضائع شاملة للشهر الحالي',
    createdAt: '2026-09-14T08:00:00Z',
  },
];

export const INITIAL_CHECKS: CheckItem[] = [
  {
    id: 'chk-1',
    checkNumber: 'CHK-88421',
    customerId: 'cust-1',
    customerName: 'مؤسسة الأمل التجارية',
    amount: 15000,
    dueDate: getDateOffset(3), // متبقي 3 أيام (قادم)
    linkedInvoiceId: 'cinv-101',
    linkedInvoiceNumber: 'INV-2026-089',
    bankName: 'مصرف الراجحي',
    notes: 'شيك مؤجل 3 أيام مقابل فاتورة توريد المواد الغذائية',
    status: 'upcoming',
    createdAt: '2026-09-19T09:00:00Z',
  },
  {
    id: 'chk-2',
    checkNumber: 'CHK-99104',
    customerId: 'cust-2',
    customerName: 'شركة الوفاق للتوريدات',
    amount: 25000,
    dueDate: getDateOffset(0), // مستحق اليوم!
    linkedInvoiceId: 'cinv-102',
    linkedInvoiceNumber: 'INV-2026-090',
    bankName: 'البنك الأهلي السعودي',
    notes: 'شيك مستحق اليوم - يرجى إيداعه صباحاً',
    status: 'due_today',
    createdAt: '2026-09-24T10:00:00Z',
  },
  {
    id: 'chk-3',
    checkNumber: 'CHK-77530',
    customerId: 'cust-4',
    customerName: 'ركن النخبة للمواد الاستهلاكية',
    amount: 32000,
    dueDate: getDateOffset(-4), // متأخر منذ 4 أيام ولم يصرف
    linkedInvoiceId: 'cinv-104',
    linkedInvoiceNumber: 'INV-2026-092',
    bankName: 'بنك الرياض',
    notes: 'تأخر في الصرف، تم التواصل مع الأخ خالد للمتابعة',
    status: 'overdue',
    createdAt: '2026-09-14T11:00:00Z',
  },
  {
    id: 'chk-4',
    checkNumber: 'CHK-66219',
    customerId: 'cust-3',
    customerName: 'سوبرماركت البركة المركزي',
    amount: 18500,
    dueDate: getDateOffset(7), // متبقي 7 أيام (قادم)
    linkedInvoiceId: 'cinv-103',
    linkedInvoiceNumber: 'INV-2026-091',
    bankName: 'بنك البلاد',
    notes: 'شيك قادم خلال أسبوع',
    status: 'upcoming',
    createdAt: '2026-09-27T10:00:00Z',
  },
  {
    id: 'chk-5',
    checkNumber: 'CHK-55102',
    customerId: 'cust-1',
    customerName: 'مؤسسة الأمل التجارية',
    amount: 12000,
    dueDate: getDateOffset(-12),
    bankName: 'مصرف الراجحي',
    notes: 'دفعة سابقة تم إيداعها وصرفها بنجاح',
    status: 'cashed',
    manualStatus: 'cashed',
    cashedDate: getDateOffset(-12),
    createdAt: '2026-09-10T12:00:00Z',
  },
];

// Fulfills the user's exact example:
// 20,000 ريال - لم يتم الاستلام
// 15,000 ريال - تم الاستلام
export const INITIAL_RECEIVED_INVOICES: ReceivedInvoice[] = [
  {
    id: 'rinv-1',
    invoiceNumber: 'REC-3001',
    sourceName: 'مصنع الشرق للصناعات الغذائية',
    amount: 20000,
    invoiceDate: getDateOffset(-3),
    notes: 'فاتورة توريد كراتين الحليب والعصائر المركزية',
    receiptStatus: 'not_received', // لم يتم الاستلام
    createdAt: '2026-09-26T09:00:00Z',
  },
  {
    id: 'rinv-2',
    invoiceNumber: 'REC-3002',
    sourceName: 'مجموعة الصافي للتوزيع العام',
    amount: 15000,
    invoiceDate: getDateOffset(-7),
    notes: 'فاتورة مواد تغليف وتعبئة مسبقة الصنع',
    receiptStatus: 'received', // تم الاستلام
    createdAt: '2026-09-22T14:00:00Z',
  },
  {
    id: 'rinv-3',
    invoiceNumber: 'REC-3003',
    sourceName: 'مؤسسة رواد النقل والتبريد',
    amount: 8500,
    invoiceDate: getDateOffset(-1),
    notes: 'خدمات نقل مبرد للشحنات المجمدة',
    receiptStatus: 'not_received', // لم يتم الاستلام
    createdAt: '2026-09-28T16:00:00Z',
  },
];

export const loadStoredData = () => {
  const today = getTodayString();

  // Load Customers
  let customers: Customer[];
  try {
    const raw = localStorage.getItem(CUSTOMERS_KEY);
    customers = raw ? JSON.parse(raw) : INITIAL_CUSTOMERS;
  } catch {
    customers = INITIAL_CUSTOMERS;
  }

  // Load Customer Invoices
  let customerInvoices: CustomerInvoice[];
  try {
    const raw = localStorage.getItem(CUSTOMER_INVOICES_KEY);
    customerInvoices = raw ? JSON.parse(raw) : INITIAL_CUSTOMER_INVOICES;
  } catch {
    customerInvoices = INITIAL_CUSTOMER_INVOICES;
  }

  // Load Checks & recalculate automatic statuses based on today's date
  let checks: CheckItem[];
  try {
    const raw = localStorage.getItem(CHECKS_KEY);
    const parsed: CheckItem[] = raw ? JSON.parse(raw) : INITIAL_CHECKS;
    checks = parsed.map((chk) => ({
      ...chk,
      status: computeCheckStatus(chk, today),
    }));
  } catch {
    checks = INITIAL_CHECKS.map((chk) => ({
      ...chk,
      status: computeCheckStatus(chk, today),
    }));
  }

  // Load Received Invoices (strictly manual status!)
  let receivedInvoices: ReceivedInvoice[];
  try {
    const raw = localStorage.getItem(RECEIVED_INVOICES_KEY);
    receivedInvoices = raw ? JSON.parse(raw) : INITIAL_RECEIVED_INVOICES;
  } catch {
    receivedInvoices = INITIAL_RECEIVED_INVOICES;
  }

  // Load Notifications
  let notifications: AlertNotification[] = [];
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_KEY);
    notifications = raw ? JSON.parse(raw) : [];
  } catch {
    notifications = [];
  }

  return { customers, customerInvoices, checks, receivedInvoices, notifications };
};

export const saveCustomers = (customers: Customer[]) => {
  localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(customers));
};

export const saveChecks = (checks: CheckItem[]) => {
  localStorage.setItem(CHECKS_KEY, JSON.stringify(checks));
};

export const saveCustomerInvoices = (invoices: CustomerInvoice[]) => {
  localStorage.setItem(CUSTOMER_INVOICES_KEY, JSON.stringify(invoices));
};

export const saveReceivedInvoices = (invoices: ReceivedInvoice[]) => {
  localStorage.setItem(RECEIVED_INVOICES_KEY, JSON.stringify(invoices));
};

export const saveNotifications = (notifications: AlertNotification[]) => {
  localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications));
};

export const resetToSeedData = () => {
  localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(INITIAL_CUSTOMERS));
  localStorage.setItem(CHECKS_KEY, JSON.stringify(INITIAL_CHECKS));
  localStorage.setItem(CUSTOMER_INVOICES_KEY, JSON.stringify(INITIAL_CUSTOMER_INVOICES));
  localStorage.setItem(RECEIVED_INVOICES_KEY, JSON.stringify(INITIAL_RECEIVED_INVOICES));
  localStorage.removeItem(NOTIFICATIONS_KEY);
  return loadStoredData();
};
