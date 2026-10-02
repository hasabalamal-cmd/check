import { CheckItem, Customer, CustomerInvoice, ReceivedInvoice, Shop } from '../types';
import { getTodayString } from '../utils/checkCalculations';

const shopId = 'LOCALTEST';

export const localTestShop: Shop = {
  shopId,
  shopName: 'متجر تجريبي محلي',
  contactName: 'مستخدم تجريبي',
  status: 'active',
  createdAt: new Date().toISOString(),
};

const today = getTodayString();

export const localTestData: {
  customers: Customer[];
  invoices: CustomerInvoice[];
  checks: CheckItem[];
  receivedInvoices: ReceivedInvoice[];
} = {
  customers: [
    {
      id: 'local-customer-1',
      shopId,
      name: 'مؤسسة المثال التجارية',
      contactPerson: 'مستخدم تجريبي',
      phone: '0500000000',
      address: 'بيانات محلية للتجربة',
      createdAt: new Date().toISOString(),
    },
  ],
  invoices: [],
  checks: [],
  receivedInvoices: [
    {
      id: 'local-received-1',
      shopId,
      invoiceNumber: 'LOCAL-REC-001',
      sourceName: 'مورد تجريبي - مستلمة',
      amount: 12500,
      invoiceDate: today,
      receiptStatus: 'تم الاستلام',
      receiptDate: today,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'local-received-2',
      shopId,
      invoiceNumber: 'LOCAL-REC-002',
      sourceName: 'مورد تجريبي - غير مستلمة',
      amount: 3400,
      invoiceDate: today,
      receiptStatus: 'لم يتم الاستلام',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'local-received-3',
      shopId,
      invoiceNumber: 'LOCAL-REC-003',
      sourceName: 'مورد تجريبي - حالة قديمة',
      amount: 2100,
      invoiceDate: today,
      receiptStatus: 'مستحق',
      createdAt: new Date().toISOString(),
    },
  ],
};

export const getLocalTestData = () => ({
  customers: localTestData.customers.map((item) => ({ ...item })),
  invoices: localTestData.invoices.map((item) => ({ ...item })),
  checks: localTestData.checks.map((item) => ({ ...item })),
  receivedInvoices: localTestData.receivedInvoices.map((item) => ({ ...item })),
});
