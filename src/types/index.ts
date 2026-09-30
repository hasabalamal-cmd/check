export type CheckStatus = 'upcoming' | 'due_today' | 'overdue' | 'cashed' | 'cancelled';

export interface Customer {
  id: string;
  name: string; // اسم المحل
  contactPerson: string; // اسم المسؤول
  phone: string; // رقم الجوال
  address: string; // العنوان
  notes?: string; // ملاحظات
  createdAt: string;
}

export interface CheckItem {
  id: string;
  checkNumber: string; // رقم الشيك
  customerId: string; // معرف العميل
  customerName: string; // اسم المحل
  amount: number; // مبلغ الشيك
  dueDate: string; // تاريخ استحقاق/خروج الشيك (YYYY-MM-DD)
  linkedInvoiceId?: string; // معرف الفاتورة المرتبطة
  linkedInvoiceNumber?: string; // رقم الفاتورة المرتبطة
  image?: string; // صورة الشيك (Data URL or URL)
  notes?: string; // ملاحظات
  status: CheckStatus; // حالة الشيك (محسوبة أو يدوية)
  manualStatus?: 'cashed' | 'cancelled'; // تم صرفه أو ملغي يدوياً
  cashedDate?: string; // تاريخ الصرف
  bankName?: string; // اسم البنك (اختياري)
  createdAt: string;
}

export interface CustomerInvoice {
  id: string;
  invoiceNumber: string; // رقم الفاتورة
  customerId: string; // معرف العميل
  customerName: string; // اسم المحل
  amount: number; // مبلغ الفاتورة
  invoiceDate: string; // تاريخ الفاتورة (YYYY-MM-DD)
  image?: string; // صورة أو ملف الفاتورة
  notes?: string; // ملاحظات
  createdAt: string;
}

export type ReceiptStatus = 'received' | 'not_received';

export interface ReceivedInvoice {
  id: string;
  invoiceNumber: string; // رقم الفاتورة
  sourceName: string; // اسم الجهة
  amount: number; // مبلغ الفاتورة
  invoiceDate: string; // تاريخ الفاتورة (YYYY-MM-DD)
  image?: string; // صورة أو ملف الفاتورة
  notes?: string; // ملاحظات
  receiptStatus: ReceiptStatus; // حالة الاستلام: تم الاستلام / لم يتم الاستلام (يدوي فقط!)
  createdAt: string;
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
