import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Plus,
  Search,
  Building,
  CreditCard,
  Eye,
  Trash2,
  Edit2,
} from 'lucide-react';
import { CustomerInvoice, Customer, CheckItem } from '../types';
import { formatCurrency, formatLocalizedDate } from '../utils/checkCalculations';
import { translate } from '../utils/i18n';

interface CustomerInvoicesViewProps {
  invoices: CustomerInvoice[];
  customers: Customer[];
  checks: CheckItem[];
  onAddInvoice: () => void;
  onEditInvoice: (invoice: CustomerInvoice) => void;
  onDeleteInvoice: (id: string) => void;
  onAddCheckForInvoice: (invoice: CustomerInvoice) => void;
  onPreviewImage: (url: string, title: string) => void;
}

export const CustomerInvoicesView: React.FC<CustomerInvoicesViewProps> = ({
  invoices,
  customers,
  checks,
  onAddInvoice,
  onEditInvoice,
  onDeleteInvoice,
  onAddCheckForInvoice,
  onPreviewImage,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [customerFilter, setCustomerFilter] = useState('all');

  const filteredInvoices = invoices.filter((inv) => {
    const term = searchTerm.trim().toLowerCase();
    const matchSearch =
      !term ||
      inv.invoiceNumber.toLowerCase().includes(term) ||
      (inv.customerName && inv.customerName.toLowerCase().includes(term)) ||
      (inv.notes && inv.notes.toLowerCase().includes(term));

    const matchCustomer = customerFilter === 'all' || inv.customerId === customerFilter;

    return matchSearch && matchCustomer;
  });

  const totalInvoicedAmount = filteredInvoices.reduce((sum, i) => sum + i.amount, 0);

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-teal-500/10 text-teal-600 dark:text-teal-400 rounded-xl">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                {translate('فواتير العملاء والمحلات')}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {translate('تسجيل الفواتير الصادرة للعملاء ومتابعة الشيكات المرتبطة بكل فاتورة')}
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={onAddInvoice}
          className="px-4 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 shadow-sm shadow-teal-600/30 transition-all active:scale-95 self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{translate('إصدار فاتورة جديدة للعميل')}</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="mobile-filter-panel bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={translate('ابحث برقم الفاتورة، اسم المحل...')}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl pr-9 pl-3 py-2 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:border-teal-500 placeholder:text-slate-400"
            />
          </div>

          <select
            value={customerFilter}
            onChange={(e) => setCustomerFilter(e.target.value)}
            className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:border-teal-500"
          >
            <option value="all">{translate('جميع المحلات والعملاء')}</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="text-xs text-slate-600 dark:text-slate-300">
          {translate('إجمالي الفواتير الصادرة:')}{' '}
          <span className="font-bold text-teal-600 dark:text-teal-400 font-mono text-sm">
            {formatCurrency(totalInvoicedAmount)}
          </span>
        </div>
      </div>

      {/* Invoices Grid */}
      {filteredInvoices.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center space-y-3">
          <FileSpreadsheet className="w-12 h-12 mx-auto text-slate-400" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">{translate('لا توجد فواتير عملاء مطابقة')}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">{translate('قم بإصدار فاتورة جديدة للمحلات.')}</p>
          <button
            onClick={onAddInvoice}
            className="px-4 py-2 bg-teal-600 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer"
          >
            {translate('إصدار فاتورة الآن')}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredInvoices.map((inv) => {
            // Find linked checks for this invoice
            const linkedChecks = checks.filter(
              (c) => c.linkedInvoiceId === inv.id || c.linkedInvoiceNumber === inv.invoiceNumber
            );
            const totalChecksAmount = linkedChecks.reduce((sum, c) => sum + c.amount, 0);
            const cashedAmount = linkedChecks
              .filter((c) => c.status === 'cashed' || c.status === 'مدفوع' || c.status === 'تم صرفه')
              .reduce((sum, c) => sum + c.amount, 0);
            const remainingBalance = Math.max(0, inv.amount - totalChecksAmount);

            return (
              <div
                key={inv.id}
                className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-5 flex flex-col justify-between shadow-xs"
              >
                <div>
                  {/* Top Bar: Invoice Number, Status & Date */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold border font-mono tracking-wider bg-slate-100 dark:bg-slate-900 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-500/30">
                        {inv.invoiceNumber}
                      </span>
                      {inv.receiptStatus === 'مستلم' || inv.receiptStatus === 'received' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400">
                          {translate("مستلمة")}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-500/15 border border-amber-200 dark:border-amber-500/30 text-amber-800 dark:text-amber-400">
                          {translate("مستحقة")}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {formatLocalizedDate(inv.invoiceDate)}
                    </span>
                  </div>

                  {/* Customer Name & Amount */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-xs">
                      <Building className="w-3.5 h-3.5" />
                      <span>{translate("المحل العميل:")}</span>
                    </div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-base truncate" title={inv.customerName}>
                      {inv.customerName}
                    </h3>
                    <div className="text-2xl font-black text-slate-900 dark:text-white font-mono mt-1">
                      {formatCurrency(inv.amount)}
                    </div>
                  </div>

                  {/* Linked Checks Status */}
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <CreditCard className="w-3.5 h-3.5 text-blue-500" />
                        <span>{translate("الشيكات المرتبطة:")}</span>
                      </span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        {translate(`${linkedChecks.length} شيك`)} ({formatCurrency(totalChecksAmount)})
                      </span>
                    </div>

                    {/* Progress bar of coverage */}
                    <div className="w-full bg-slate-100 dark:bg-slate-900 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-emerald-500 h-2 transition-all"
                        style={{
                          width: `${Math.min(100, (totalChecksAmount / inv.amount) * 100)}%`,
                        }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                      <span>{translate('تم صرفه:')} {formatCurrency(cashedAmount)}</span>
                      <span>
                        {remainingBalance > 0 ? (
                          <span className="text-amber-600 dark:text-amber-400">{translate('متبقي:')} {formatCurrency(remainingBalance)}</span>
                        ) : (
                          <span className="text-emerald-600 dark:text-emerald-400">{translate("مغطاة بالكامل")}</span>
                        )}
                      </span>
                    </div>

                    {inv.notes && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 bg-slate-50 dark:bg-slate-900/40 p-2 rounded-lg mt-1 border border-slate-100 dark:border-slate-800">
                        {inv.notes}
                      </p>
                    )}
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    {inv.image && (
                      <button
                        onClick={() => onPreviewImage(inv.image!, `فاتورة عميل ${inv.invoiceNumber}`)}
                        className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl transition-colors text-xs flex items-center gap-1 cursor-pointer"
                        title={translate("معاينة الفاتورة")}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>{translate("معاينة")}</span>
                      </button>
                    )}
                    <button
                      onClick={() => onEditInvoice(inv)}
                      className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl transition-colors text-xs cursor-pointer"
                      title={translate("تعديل الفاتورة")}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDeleteInvoice(inv.id)}
                      className="p-2 bg-slate-100 hover:bg-rose-100 dark:bg-slate-700 dark:hover:bg-rose-900/60 text-slate-600 hover:text-rose-600 dark:text-slate-300 dark:hover:text-rose-300 rounded-xl transition-colors text-xs cursor-pointer"
                      title={translate("حذف الفاتورة")}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    onClick={() => onAddCheckForInvoice(inv)}
                    className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-600/25 dark:hover:bg-blue-600 text-blue-700 dark:text-blue-300 hover:text-blue-900 dark:hover:text-white border border-blue-200 dark:border-blue-500/40 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{translate("ربط شيك")}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
