import React from 'react';
import {
  X,
  Store,
  User,
  Phone,
  MapPin,
  FileText,
  CreditCard,
  FileSpreadsheet,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle2,
  Plus,
  MessageCircle,
  ExternalLink,
} from 'lucide-react';
import { Customer, CheckItem, CustomerInvoice } from '../types';
import { formatCurrency, formatArabicDate, CHECK_STATUS_CONFIG } from '../utils/checkCalculations';

interface CustomerDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  customerChecks: CheckItem[];
  customerInvoices: CustomerInvoice[];
  onAddCheck: () => void;
  onAddInvoice: () => void;
  onEditCustomer: (customer: Customer) => void;
  onCashCheck: (checkId: string) => void;
  onPreviewImage: (url: string, title: string) => void;
}

export const CustomerDetailModal: React.FC<CustomerDetailModalProps> = ({
  isOpen,
  onClose,
  customer,
  customerChecks,
  customerInvoices,
  onAddCheck,
  onAddInvoice,
  onEditCustomer,
  onCashCheck,
  onPreviewImage,
}) => {
  if (!isOpen || !customer) return null;

  // Financial calculations for this customer
  const totalInvoiced = customerInvoices.reduce((sum, inv) => sum + inv.amount, 0);
  const totalChecks = customerChecks.reduce((sum, chk) => sum + chk.amount, 0);

  const upcomingChecks = customerChecks.filter(
    (c) => c.status === 'upcoming' || c.status === 'قادم' || c.status === 'due_today' || c.status === 'مستحق اليوم'
  );
  const upcomingAmount = upcomingChecks.reduce((sum, c) => sum + c.amount, 0);

  const overdueChecks = customerChecks.filter((c) => c.status === 'overdue' || c.status === 'متأخر');
  const overdueAmount = overdueChecks.reduce((sum, c) => sum + c.amount, 0);

  const paidChecks = customerChecks.filter(
    (c) => c.status === 'cashed' || c.status === 'مدفوع' || c.manualStatus === 'cashed' || c.manualStatus === 'مدفوع'
  );
  const paidAmount = paidChecks.reduce((sum, c) => sum + c.amount, 0);

  // Phone clean for whatsapp
  const cleanPhone = customer.phone.replace(/[^0-9]/g, '');
  const whatsappNumber = cleanPhone.startsWith('0') ? '966' + cleanPhone.substring(1) : cleanPhone;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm p-4 animate-in fade-in overflow-y-auto">
      <div className="relative max-w-4xl w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden my-6 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/95 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-500 flex items-center justify-center text-white shadow-md shadow-indigo-600/20">
              <Store className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-black text-slate-900 dark:text-white">{customer.name}</h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 font-mono">
                  {customer.id}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1 flex-wrap">
                <span className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>المسؤول: {customer.contactPerson}</span>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-mono text-slate-700 dark:text-slate-300">{customer.phone}</span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={`https://wa.me/${whatsappNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-600/20 dark:hover:bg-emerald-600/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="محادثة واتساب"
            >
              <MessageCircle className="w-4 h-4" />
              <span className="hidden sm:inline">واتساب</span>
            </a>
            <button
              onClick={() => onEditCustomer(customer)}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
            >
              تعديل العميل
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80">
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">إجمالي الفواتير</div>
              <div className="text-xl font-black text-slate-900 dark:text-white font-mono mt-1">
                {formatCurrency(totalInvoiced)}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                {customerInvoices.length} فاتورة
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-slate-800/80 border border-blue-200 dark:border-blue-500/30">
              <div className="text-[11px] text-blue-700 dark:text-blue-400 font-medium">الشيكات القادمة</div>
              <div className="text-xl font-black text-blue-700 dark:text-blue-300 font-mono mt-1">
                {formatCurrency(upcomingAmount)}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                {upcomingChecks.length} شيك قادم
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-rose-50/50 dark:bg-slate-800/80 border border-rose-200 dark:border-rose-500/30">
              <div className="text-[11px] text-rose-700 dark:text-rose-400 font-medium">الشيكات المتأخرة</div>
              <div className="text-xl font-black text-rose-700 dark:text-rose-300 font-mono mt-1">
                {formatCurrency(overdueAmount)}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                {overdueChecks.length} شيك متأخر
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-slate-800/80 border border-emerald-200 dark:border-emerald-500/30">
              <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">الشيكات المدفوعة</div>
              <div className="text-xl font-black text-emerald-700 dark:text-emerald-400 font-mono mt-1">
                {formatCurrency(paidAmount)}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                {paidChecks.length} شيك تم صرفه
              </div>
            </div>
          </div>

          {/* Customer info card */}
          {customer.address && (
            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                <MapPin className="w-4 h-4 text-slate-400" />
                <span>العنوان: {customer.address}</span>
              </span>
              {customer.notes && <span className="text-slate-500 dark:text-slate-400 italic">"{customer.notes}"</span>}
            </div>
          )}

          {/* Section 1: Customer Invoices */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 rounded-lg">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                  فواتير التوريد للمحل ({customerInvoices.length})
                </h3>
              </div>
              <button
                onClick={onAddInvoice}
                className="px-3 py-1.5 bg-cyan-50 hover:bg-cyan-100 dark:bg-cyan-600/20 dark:hover:bg-cyan-600/30 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-500/30 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إصدار فاتورة</span>
              </button>
            </div>

            {customerInvoices.length === 0 ? (
              <div className="p-6 bg-slate-50 dark:bg-slate-800/30 rounded-2xl text-center text-xs text-slate-500">
                لا توجد فواتير مسجلة لهذا العميل بعد.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {customerInvoices.map((inv) => (
                  <div
                    key={inv.id}
                    className="p-3.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/60 rounded-xl flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-mono font-bold text-cyan-700 dark:text-cyan-300">{inv.invoiceNumber}</div>
                      <div className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                        التاريخ: {formatArabicDate(inv.invoiceDate)}
                      </div>
                      {inv.notes && (
                        <div className="text-slate-500 text-[10px] mt-1 line-clamp-1">{inv.notes}</div>
                      )}
                    </div>
                    <div className="text-left">
                      <div className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                        {formatCurrency(inv.amount)}
                      </div>
                      {inv.image && (
                        <button
                          onClick={() => onPreviewImage(inv.image!, `فاتورة ${inv.invoiceNumber}`)}
                          className="text-[10px] text-cyan-600 dark:text-cyan-400 hover:underline mt-1 block cursor-pointer"
                        >
                          معاينة الفاتورة
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 2: Customer Cheques */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg">
                  <CreditCard className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                  شيكات المحل المستلمة ({customerChecks.length})
                </h3>
              </div>
              <button
                onClick={onAddCheck}
                className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-600/20 dark:hover:bg-blue-600/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>تسجيل شيك</span>
              </button>
            </div>

            {customerChecks.length === 0 ? (
              <div className="p-6 bg-slate-50 dark:bg-slate-800/30 rounded-2xl text-center text-xs text-slate-500">
                لا توجد شيكات مسجلة لهذا العميل حتى الآن.
              </div>
            ) : (
              <div className="space-y-2.5">
                {customerChecks.map((chk) => {
                  const cfg = CHECK_STATUS_CONFIG[chk.status] || CHECK_STATUS_CONFIG['upcoming'];
                  const isPaid = chk.status === 'cashed' || chk.status === 'مدفوع';

                  return (
                    <div
                      key={chk.id}
                      className="p-3.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/60 rounded-xl flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-900 dark:text-white">{chk.checkNumber}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${cfg.badgeBg}`}>
                            {cfg.label}
                          </span>
                        </div>
                        <div className="text-slate-500 dark:text-slate-400 text-[11px]">
                          تاريخ الاستحقاق: {formatArabicDate(chk.dueDate)}
                          {chk.linkedInvoiceNumber && (
                            <span className="mr-2 text-cyan-600 dark:text-cyan-300">
                              (مرتبط بفاتورة {chk.linkedInvoiceNumber})
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                          {formatCurrency(chk.amount)}
                        </span>
                        {chk.image && (
                          <button
                            onClick={() => onPreviewImage(chk.image!, `شيك ${chk.checkNumber}`)}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-xs cursor-pointer"
                            title="معاينة الشيك"
                          >
                            معاينة
                          </button>
                        )}
                        {!isPaid && (
                          <button
                            onClick={() => onCashCheck(chk.id)}
                            className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                          >
                            صرف الشيك
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
