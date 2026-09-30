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

export interface Customer {
  id: string; // CustomerID
  name: string; // ShopName (اسم المحل)
  contactPerson: string; // ContactName (اسم المسؤول)
  phone: string; // Phone (رقم الجوال)
  address: string; // Address (العنوان)
  notes?: string; // Notes (ملاحظات)
  createdAt: string; // CreatedAt
}

export interface CheckItem {
  id: string; // ChequeID
  checkNumber: string; // ChequeNumber (رقم الشيك)
  customerId: string; // CustomerID (معرف العميل)
  customerName: string; // اسم المحل للتسهيل في العرض
  amount: number; // Amount (مبلغ الشيك)
  dueDate: string; // DueDate (تاريخ استحقاق/خروج الشيك YYYY-MM-DD)
  linkedInvoiceId?: string; // InvoiceID (معرف الفاتورة المرتبطة)
  linkedInvoiceNumber?: string; // رقم الفاتورة المرتبطة
  image?: string; // ChequeImage (رابط الصورة في Google Drive أو Data URL)
  bankName?: string; // Bank (اسم البنك)
  notes?: string; // Notes (ملاحظات)
  status: CheckStatus; // Status (الحالة المحسوبة أو المحددة)
  manualStatus?: 'cashed' | 'cancelled' | 'مدفوع' | 'ملغي'; // الحالة اليدوية
  cashedDate?: string; // PaidDate (تاريخ السداد / الصرف)
  createdAt: string; // CreatedAt
}

export interface CustomerInvoice {
  id: string; // InvoiceID
  invoiceNumber: string; // InvoiceNumber (رقم الفاتورة)
  customerId: string; // CustomerID (معرف العميل)
  customerName?: string; // اسم المحل
  amount: number; // Amount (مبلغ الفاتورة)
  invoiceDate: string; // InvoiceDate (تاريخ الفاتورة YYYY-MM-DD)
  receiptStatus?: 'مستلم' | 'مستحق' | 'received' | 'not_received'; // ReceiptStatus (حالة الاستحقاق/الاستلام)
  receiptDate?: string; // ReceiptDate (تاريخ الاستلام)
  image?: string; // InvoiceFile (رابط الفاتورة في Google Drive أو Data URL)
  notes?: string; // Notes (ملاحظات)
  createdAt: string; // CreatedAt
}

export type ReceiptStatus = 'received' | 'not_received' | 'تم الاستلام' | 'لم يتم الاستلام';

export interface ReceivedInvoice {
  id: string; // ReceivedInvoiceID
  invoiceNumber: string; // InvoiceNumber (رقم الفاتورة)
  sourceName: string; // EntityName (اسم الجهة)
  amount: number; // Amount (مبلغ الفاتورة)
  invoiceDate: string; // InvoiceDate (تاريخ الفاتورة YYYY-MM-DD)
  image?: string; // InvoiceFile (رابط الفاتورة في Google Drive أو Data URL)
  notes?: string; // Notes (ملاحظات)
  receiptStatus: ReceiptStatus; // ReceiptStatus: تم الاستلام / لم يتم الاستلام (يدوي فقط!)
  receiptDate?: string; // ReceiptDate (تاريخ الاستلام)
  createdAt: string; // CreatedAt
  // النسبة خاصة بالعمليات الحسابية الداخلية ولا تظهر أبدًا في واجهة المستخدم
  _internalRate?: number;
}

export interface AlertNotification {
  id: string;
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
}

