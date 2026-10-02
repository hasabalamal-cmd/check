import React, { useState } from 'react';
import {
  FileCheck,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Building2,
  Calendar,
  Eye,
  Trash2,
  Edit2,
  ArrowUpDown,
} from 'lucide-react';
import { CustomerInvoice, ReceivedInvoice } from '../types';
import { formatCurrency, formatLocalizedDate } from '../utils/checkCalculations';
import { isReceiptReceived } from '../utils/receiptStatus';
import { parseAmount } from '../utils/parseAmount';
import { translate } from '../utils/i18n';

interface ReceivedInvoicesViewProps {
  invoices: ReceivedInvoice[];
  customerInvoices: CustomerInvoice[];
  onIssueCustomerInvoice: () => void;
  onEditInvoice: (invoice: ReceivedInvoice | CustomerInvoice, kind: 'supplier' | 'customer') => void;
  onDeleteInvoice: (id: string, kind: 'supplier' | 'customer') => void;
  onToggleReceiptStatus: (id: string, kind: 'supplier' | 'customer') => void;
  onPreviewImage: (url: string, title: string) => void;
}

export const ReceivedInvoicesView: React.FC<ReceivedInvoicesViewProps> = ({
  invoices,
  customerInvoices,
  onIssueCustomerInvoice,
  onEditInvoice,
  onDeleteInvoice,
  onToggleReceiptStatus,
  onPreviewImage,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [receiptFilter, setReceiptFilter] = useState<'all' | 'received' | 'not_received'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'source'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const allInvoices = [
    ...invoices.map((invoice) => ({ kind: 'supplier' as const, invoice, sourceName: invoice.sourceName })),
    ...customerInvoices.map((invoice) => ({
      kind: 'customer' as const,
      invoice,
      sourceName: invoice.customerName || invoice.customerId,
    })),
  ];
  const unreceivedInvoices = allInvoices.filter(({ invoice }) => !isReceiptReceived(invoice.receiptStatus));
  const receivedInvoices = allInvoices.filter(({ invoice }) => isReceiptReceived(invoice.receiptStatus));
  const totalUnreceivedAmount = unreceivedInvoices.reduce((sum, entry) => sum + parseAmount(entry.invoice.amount), 0);
  const totalReceivedAmount = receivedInvoices.reduce((sum, entry) => sum + parseAmount(entry.invoice.amount), 0);
  const totalAllAmount = allInvoices.reduce((sum, entry) => sum + parseAmount(entry.invoice.amount), 0);

  const filteredInvoices = allInvoices
    .filter(({ invoice, sourceName }) => {
      const term = searchTerm.trim().toLowerCase();
      const matchSearch =
        !term ||
        invoice.invoiceNumber.toLowerCase().includes(term) ||
        sourceName.toLowerCase().includes(term) ||
        (invoice.notes && invoice.notes.toLowerCase().includes(term));
      const isReceived = isReceiptReceived(invoice.receiptStatus);
      const matchReceipt =
        receiptFilter === 'all' ||
        (receiptFilter === 'received' ? isReceived : !isReceived);
      return matchSearch && matchReceipt;
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'date') {
        comparison = new Date(a.invoice.invoiceDate).getTime() - new Date(b.invoice.invoiceDate).getTime();
      } else if (sortBy === 'amount') {
        comparison = parseAmount(a.invoice.amount) - parseAmount(b.invoice.amount);
      } else {
        comparison = a.sourceName.localeCompare(b.sourceName, 'ar');
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <FileCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                {translate('الفواتير')}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {translate('عرض ومتابعة فواتير الموردين والعملاء وحالات الاستلام')}
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={onIssueCustomerInvoice}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 shadow-sm shadow-emerald-600/30 transition-all active:scale-95 self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{translate('إصدار فاتورة عميل')}</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Unreceived summary */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-amber-500/30 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs text-amber-700 dark:text-amber-400 font-medium">{translate('إجمالي الفواتير غير المستلمة')}</div>
            <div className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-300 font-mono mt-1">
              {formatCurrency(totalUnreceivedAmount)}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {unreceivedInvoices.length} {translate('فاتورة غير مستلمة')}
            </div>
          </div>
          <div className="p-3 bg-amber-500/15 text-amber-600 dark:text-amber-400 rounded-xl">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* Received summary */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-500/30 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">{translate('إجمالي الفواتير المستلمة')}</div>
            <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono mt-1">
              {formatCurrency(totalReceivedAmount)}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {receivedInvoices.length} {translate('فاتورة مستلمة')}
            </div>
          </div>
          <div className="p-3 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 rounded-xl">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        {/* Total sum */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">{translate('إجمالي قيمة جميع الفواتير')}</div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono mt-1">
              {formatCurrency(totalAllAmount)}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {translate('إجمالي الفواتير')}: {allInvoices.length}
            </div>
          </div>
          <div className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl">
            <FileCheck className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="mobile-filter-panel bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Search box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={translate('ابحث برقم الفاتورة، اسم الجهة...')}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl pr-9 pl-3 py-2 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:border-emerald-500 placeholder:text-slate-400"
            />
          </div>

          {/* Receipt Status Filter */}
          <div>
            <select
              value={receiptFilter}
              onChange={(e) => setReceiptFilter(e.target.value as any)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:border-emerald-500"
            >
              <option value="all">{translate('كل حالات الاستلام')} ({allInvoices.length})</option>
              <option value="not_received">{translate('لم يتم الاستلام')} ({unreceivedInvoices.length})</option>
              <option value="received">{translate('تم الاستلام')} ({receivedInvoices.length})</option>
            </select>
          </div>

          {/* Sort By */}
          <div className="flex items-center gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:border-emerald-500"
            >
              <option value="date">{translate('ترتيب حسب التاريخ')}</option>
              <option value="amount">{translate('ترتيب حسب المبلغ')}</option>
              <option value="source">{translate('ترتيب حسب اسم الجهة')}</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
              title={translate('تبديل اتجاه الترتيب')}
            >
              <ArrowUpDown className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick status tabs */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setReceiptFilter('all')}
              className={`px-3 py-1 rounded-xl font-medium transition-all cursor-pointer ${
                receiptFilter === 'all'
                  ? 'bg-emerald-600 text-white font-bold shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              {translate('الكل')} ({allInvoices.length})
            </button>
            <button
              onClick={() => setReceiptFilter('not_received')}
              className={`px-3 py-1 rounded-xl font-medium transition-all cursor-pointer ${
                receiptFilter === 'not_received'
                  ? 'bg-amber-600 text-white font-bold shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              {translate('لم يتم الاستلام')} ({unreceivedInvoices.length})
            </button>
            <button
              onClick={() => setReceiptFilter('received')}
              className={`px-3 py-1 rounded-xl font-medium transition-all cursor-pointer ${
                receiptFilter === 'received'
                  ? 'bg-emerald-600 text-white font-bold shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              {translate('تم الاستلام')} ({receivedInvoices.length})
            </button>
          </div>

          <div className="text-slate-500 dark:text-slate-400 text-xs">
            {translate('النتائج والإجماليات تشمل فواتير الموردين والعملاء.')}
          </div>
        </div>
      </div>

      {/* Invoices List / Grid */}
      {filteredInvoices.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center space-y-3">
          <FileCheck className="w-12 h-12 mx-auto text-slate-400" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">{translate('لا توجد فواتير مطابقة')}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">{translate('جرّب تعديل معايير البحث أو إصدار فاتورة عميل جديدة.')}</p>
          <button
            onClick={onIssueCustomerInvoice}
            className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold shadow-sm cursor-pointer"
          >
            {translate('إصدار فاتورة عميل')}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredInvoices.map(({ invoice: inv, kind, sourceName }) => {
            const isReceived = isReceiptReceived(inv.receiptStatus);
            const invoiceKind = kind === 'customer' ? 'customer' : 'supplier';

            return (
              <div
                key={`${kind}-${inv.id}`}
                className={`rounded-2xl border p-5 flex flex-col justify-between transition-all shadow-xs ${
                  isReceived
                    ? 'bg-white dark:bg-slate-800/60 border-emerald-500/30'
                    : 'bg-white dark:bg-slate-800/90 border-amber-500/40 shadow-sm'
                }`}
              >
                <div>
                  {/* Top Bar: Invoice Number & Manual Toggle */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold border font-mono tracking-wider bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700">
                      {inv.invoiceNumber}
                    </span>

                    {/* Quick Manual Toggle Button */}
                    <button
                      onClick={() => onToggleReceiptStatus(inv.id, invoiceKind)}
                      className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 transition-all shadow-xs cursor-pointer ${
                        isReceived
                          ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/40 hover:bg-emerald-100'
                          : 'bg-amber-50 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-500/40 hover:bg-amber-100'
                      }`}
                      title={translate("انقر لتغيير حالة الاستلام يدوياً")}
                    >
                      {isReceived ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span>{translate("تم الاستلام")}</span>
                        </>
                      ) : (
                        <>
                          <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                          <span>{translate("لم يتم الاستلام")}</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Issuer Name & Amount */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-xs">
                      <Building2 className="w-3.5 h-3.5" />
                      <span>{translate(kind === 'customer' ? 'العميل:' : 'الجهة الموردة:')}</span>
                    </div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-base truncate" title={sourceName}>
                      {sourceName}
                    </h3>
                    <span className={`inline-flex mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      kind === 'customer'
                        ? 'bg-teal-50 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                    }`}>
                      {translate(kind === 'customer' ? 'فاتورة عميل' : 'فاتورة مورد')}
                    </span>
                    <div className="text-2xl font-black text-slate-900 dark:text-white font-mono mt-1">
                      {formatCurrency(parseAmount(inv.amount))}
                    </div>
                  </div>

                  {/* Metadata: Date & Notes */}
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{translate('تاريخ الفاتورة:')}</span>
                      </span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {formatLocalizedDate(inv.invoiceDate)}
                      </span>
                    </div>

                    {inv.notes && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-1 bg-slate-50 dark:bg-slate-900/40 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                        {inv.notes}
                      </p>
                    )}
                  </div>
                </div>

                {/* Bottom Actions Bar */}
                <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    {inv.image && (
                      <button
                        onClick={() => onPreviewImage(inv.image!, `فاتورة ${inv.invoiceNumber}`)}
                        className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl transition-colors text-xs flex items-center gap-1 cursor-pointer"
                        title={translate('معاينة الفاتورة أو المستند')}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>{translate('معاينة')}</span>
                      </button>
                    )}
                    <button
                      onClick={() => onEditInvoice(inv, invoiceKind)}
                      className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl transition-colors text-xs cursor-pointer"
                      title={translate('تعديل الفاتورة')}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDeleteInvoice(inv.id, invoiceKind)}
                      className="p-2 bg-slate-100 hover:bg-rose-100 dark:bg-slate-700 dark:hover:bg-rose-900/60 text-slate-600 hover:text-rose-600 dark:text-slate-300 dark:hover:text-rose-300 rounded-xl transition-colors text-xs cursor-pointer"
                      title={translate('حذف الفاتورة')}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Manual Toggle Link */}
                  <button
                    onClick={() => onToggleReceiptStatus(inv.id, invoiceKind)}
                    className="text-xs text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white underline font-medium cursor-pointer"
                  >
                    {translate('تغيير إلى')} {translate(isReceived ? 'لم يتم الاستلام' : 'تم الاستلام')}
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
