export type CheckStatus =
  | 'upcoming'
  | 'due_today'
  | 'overdue'
  | 'cashed'
  | 'cancelled'
  | 'قادم'
  | 'مستحق اليوم'
  | 'متأخر'
  | 'مدفوع'
  | 'تم صرفه'
  | 'ملغي';

export interface Attachment {
  id?: string;
  name: string;
  url: string; // Direct link or drive thumbnail/view URL
  fileId?: string;
  mimeType?: string;
  size?: number;
}

export interface Shop {
  shopId: string; // Unique ID (e.g., BUNN, ABC001)
  shopName: string; // Display name
  contactName?: string;
  phone?: string;
  email?: string;
  status: 'active' | 'inactive';
  notes?: string;
  createdAt: string;
}

export type UserRole = 'admin' | 'shop_user';

export interface UserSession {
  userId: string;
  sessionId: string;
  token: string;
  localTestOnly?: boolean;
  username: string;
  name: string;
  shopName: string;
  role: UserRole;
  allowedShopIds: string[];
  currentShopId: string;
  createdAt: string;
  expiresAt: string;
}

export interface Customer {
  id: string; // CustomerID
  shopId?: string; // Multi-tenant ShopID
  name: string; // ShopName (اسم المحل)
  contactPerson: string; // ContactName (اسم المسؤول)
  phone: string; // Phone (رقم الجوال)
  address: string; // Address (العنوان)
  notes?: string; // Notes (ملاحظات)
  createdAt: string; // CreatedAt
}

export interface CheckItem {
  id: string; // ChequeID
  shopId?: string; // Multi-tenant ShopID
  checkNumber: string; // ChequeNumber (رقم الشيك)
  customerId: string; // CustomerID (معرف العميل)
  customerName: string; // اسم المحل للتسهيل في العرض
  amount: number; // Amount (مبلغ الشيك)
  dueDate: string; // DueDate (تاريخ استحقاق/خروج الشيك YYYY-MM-DD)
  linkedInvoiceId?: string; // InvoiceID (معرف الفاتورة المرتبطة)
  linkedInvoiceNumber?: string; // رقم الفاتورة المرتبطة
  image?: string; // ChequeImage (رابط الصورة في Google Drive أو Data URL أو JSON string)
  attachments?: Attachment[]; // قائمة المرفقات المتعددة
  notes?: string; // Notes (ملاحظات)
  status: CheckStatus; // Status (الحالة المحسوبة أو المحددة)
  manualStatus?: 'cashed' | 'cancelled' | 'مدفوع' | 'ملغي'; // الحالة اليدوية
  cashedDate?: string; // PaidDate (تاريخ السداد / الصرف)
  createdAt: string; // CreatedAt
}

export interface CustomerInvoice {
  id: string; // InvoiceID
  shopId?: string; // Multi-tenant ShopID
  invoiceNumber: string; // InvoiceNumber (رقم الفاتورة)
  customerId: string; // CustomerID (معرف العميل)
  customerName?: string; // اسم المحل / العميل
  amount: number; // Amount (مبلغ الفاتورة)
  invoiceDate: string; // InvoiceDate (تاريخ الفاتورة YYYY-MM-DD)
  receiptStatus?: 'مستلم' | 'مستحق' | 'received' | 'not_received'; // ReceiptStatus (حالة الاستحقاق/الاستلام)
  receiptDate?: string; // ReceiptDate (تاريخ الاستلام)
  image?: string; // InvoiceFile (رابط الفاتورة في Google Drive أو Data URL أو JSON string)
  attachments?: Attachment[]; // قائمة المرفقات المتعددة
  notes?: string; // Notes (ملاحظات)
  createdAt: string; // CreatedAt
}

export type ReceiptStatus =
  | 'received'
  | 'not_received'
  | 'تم الاستلام'
  | 'لم يتم الاستلام'
  | 'مستلم'
  | 'مستلمة'
  | 'مستحق';

export interface ReceivedInvoice {
  id: string; // ReceivedInvoiceID
  shopId?: string; // Multi-tenant ShopID
  invoiceNumber: string; // InvoiceNumber (رقم الفاتورة)
  sourceName: string; // EntityName (اسم الجهة)
  amount: number; // Amount (مبلغ الفاتورة)
  invoiceDate: string; // InvoiceDate (تاريخ الفاتورة YYYY-MM-DD)
  image?: string; // InvoiceFile (رابط الفاتورة في Google Drive أو Data URL أو JSON string)
  attachments?: Attachment[]; // قائمة المرفقات المتعددة
  notes?: string; // Notes (ملاحظات)
  receiptStatus: ReceiptStatus; // ReceiptStatus: تم الاستلام / لم يتم الاستلام (يدوي فقط!)
  receiptDate?: string; // ReceiptDate (تاريخ الاستلام)
  createdAt: string; // CreatedAt
  _internalRate?: number;
}

export interface AlertNotification {
  id: string;
  shopId?: string;
  checkId: string;
  storeName: string;
  amount: number;
  dueDate: string;
  daysRemaining: number;
  message: string;
  timestamp: string;
  type: '7_days' | '3_days' | '1_day' | 'today' | 'overdue';
  isRead: boolean;
}

export interface AppSettings {
  reminder1Days: number; // 7
  reminder2Days: number; // 3
  reminder3Days: number; // 1
  reminderToday: number; // 0
  gasWebAppUrl?: string; // رابط تطبيق الويب لـ Google Apps Script
  theme?: 'dark' | 'light';
}
