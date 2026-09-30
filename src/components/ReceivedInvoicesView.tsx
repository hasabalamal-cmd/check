import React, { useState, useMemo } from 'react';
import {
  FileCheck,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Eye,
  Trash2,
  Edit2,
  Calendar,
  Building2,
  ArrowUpDown,
  Filter,
} from 'lucide-react';
import { ReceivedInvoice, ReceiptStatus } from '../types';
import { formatCurrency, formatArabicDate } from '../utils/checkCalculations';

interface ReceivedInvoicesViewProps {
  invoices: ReceivedInvoice[];
  onAddInvoice: () => void;
  onEditInvoice: (invoice: ReceivedInvoice) => void;
  onDeleteInvoice: (id: string) => void;
  onToggleReceiptStatus: (id: string) => void;
  onPreviewImage: (url: string, title: string) => void;
}

export const ReceivedInvoicesView: React.FC<ReceivedInvoicesViewProps> = ({
  invoices,
  onAddInvoice,
  onEditInvoice,
  onDeleteInvoice,
  onToggleReceiptStatus,
  onPreviewImage,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [receiptFilter, setReceiptFilter] = useState<'all' | 'received' | 'not_received'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'source'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Summary Metrics
  const totalAllAmount = invoices.reduce((sum, inv) => sum + inv.amount, 0);
  const unreceivedInvoices = invoices.filter(
    (inv) => inv.receiptStatus === 'not_received' || inv.receiptStatus === 'لم يتم الاستلام'
  );
  const totalUnreceivedAmount = unreceivedInvoices.reduce((sum, inv) => sum + inv.amount, 0);
  const receivedInvoices = invoices.filter(
    (inv) => inv.receiptStatus === 'received' || inv.receiptStatus === 'تم الاستلام'
  );
  const totalReceivedAmount = receivedInvoices.reduce((sum, inv) => sum + inv.amount, 0);

  // Filtered list
  const filteredInvoices = useMemo(() => {
    return invoices
      .filter((inv) => {
        if (searchTerm.trim()) {
          const term = searchTerm.toLowerCase();
          const matchNumber = inv.invoiceNumber.toLowerCase().includes(term);
          const matchSource = inv.sourceName.toLowerCase().includes(term);
          const matchNotes = inv.notes?.toLowerCase().includes(term) || false;
          if (!matchNumber && !matchSource && !matchNotes) return false;
        }

        if (receiptFilter === 'received') {
          if (inv.receiptStatus !== 'received' && inv.receiptStatus !== 'تم الاستلام') {
            return false;
          }
        } else if (receiptFilter === 'not_received') {
          if (inv.receiptStatus !== 'not_received' && inv.receiptStatus !== 'لم يتم الاستلام') {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        let cmp = 0;
        if (sortBy === 'date') {
          cmp = a.invoiceDate.localeCompare(b.invoiceDate);
        } else if (sortBy === 'amount') {
          cmp = a.amount - b.amount;
        } else if (sortBy === 'source') {
          cmp = a.sourceName.localeCompare(b.sourceName, 'ar');
        }
        return sortOrder === 'asc' ? cmp : -cmp;
      });
  }, [invoices, searchTerm, receiptFilter, sortBy, sortOrder]);

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
              <FileCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white">
                الفواتير المستلمة
              </h1>
              <p className="text-xs text-slate-400">
                قسم مستقل لمتابعة الفواتير المستلمة من الشركات والجهات الموردة وتحديد حالة الاستلام يدوياً
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={onAddInvoice}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition-all active:scale-95 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>تسجيل فاتورة مستلمة</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Unreceived summary */}
        <div className="p-4 rounded-2xl bg-slate-800/90 border border-amber-500/40 shadow-lg flex items-center justify-between">
          <div>
            <div className="text-xs text-amber-400 font-medium">لم يتم الاستلام</div>
            <div className="text-xl sm:text-2xl font-black text-amber-300 font-mono mt-1">
              {formatCurrency(totalUnreceivedAmount)}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              {unreceivedInvoices.length} فواتير معلقة
            </div>
          </div>
          <div className="p-3 bg-amber-500/15 text-amber-400 rounded-xl">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* Received summary */}
        <div className="p-4 rounded-2xl bg-slate-800/90 border border-emerald-500/40 shadow-lg flex items-center justify-between">
          <div>
            <div className="text-xs text-emerald-400 font-medium">تم الاستلام</div>
            <div className="text-xl sm:text-2xl font-black text-emerald-400 font-mono mt-1">
              {formatCurrency(totalReceivedAmount)}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              {receivedInvoices.length} فواتير مستلمة
            </div>
          </div>
          <div className="p-3 bg-emerald-500/15 text-emerald-400 rounded-xl">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        {/* Total sum */}
        <div className="p-4 rounded-2xl bg-slate-800/70 border border-slate-700 shadow-lg flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400 font-medium">إجمالي الفواتير المسجلة</div>
            <div className="text-xl sm:text-2xl font-black text-white font-mono mt-1">
              {formatCurrency(totalAllAmount)}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              إجمالي {invoices.length} فاتورة
            </div>
          </div>
          <div className="p-3 bg-slate-700/60 text-slate-300 rounded-xl">
            <FileCheck className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-800/80 border border-slate-700/70 rounded-2xl p-4 shadow-md space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Search box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ابحث برقم الفاتورة، اسم الجهة..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl pr-9 pl-3 py-2 text-white text-xs sm:text-sm focus:outline-none focus:border-emerald-500 placeholder:text-slate-500"
            />
          </div>

          {/* Receipt Status Filter */}
          <div>
            <select
              value={receiptFilter}
              onChange={(e) => setReceiptFilter(e.target.value as any)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs sm:text-sm focus:outline-none focus:border-emerald-500"
            >
              <option value="all">كل حالات الاستلام ({invoices.length})</option>
              <option value="not_received">لم يتم الاستلام ({unreceivedInvoices.length})</option>
              <option value="received">تم الاستلام ({receivedInvoices.length})</option>
            </select>
          </div>

          {/* Sort By */}
          <div className="flex items-center gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs sm:text-sm focus:outline-none focus:border-emerald-500"
            >
              <option value="date">ترتيب حسب التاريخ</option>
              <option value="amount">ترتيب حسب المبلغ</option>
              <option value="source">ترتيب حسب اسم الجهة</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="p-2 bg-slate-900 border border-slate-700 hover:bg-slate-700 rounded-xl text-slate-300"
              title="تبديل اتجاه الترتيب"
            >
              <ArrowUpDown className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick status tabs */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-700/60 text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setReceiptFilter('all')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                receiptFilter === 'all'
                  ? 'bg-emerald-600 text-white font-bold'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200'
              }`}
            >
              الكل ({invoices.length})
            </button>
            <button
              onClick={() => setReceiptFilter('not_received')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                receiptFilter === 'not_received'
                  ? 'bg-amber-600 text-white font-bold'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200'
              }`}
            >
              لم يتم الاستلام ({unreceivedInvoices.length})
            </button>
            <button
              onClick={() => setReceiptFilter('received')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                receiptFilter === 'received'
                  ? 'bg-emerald-600 text-white font-bold'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200'
              }`}
            >
              تم الاستلام ({receivedInvoices.length})
            </button>
          </div>

          <div className="text-slate-400 text-xs">
            * حالة الاستلام تخضع للتحكم اليدوي المباشر فقط.
          </div>
        </div>
      </div>

      {/* Invoices List / Grid */}
      {filteredInvoices.length === 0 ? (
        <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-12 text-center space-y-3">
          <FileCheck className="w-12 h-12 mx-auto text-slate-500" />
          <h3 className="text-base font-bold text-slate-300">لا توجد فواتير مستلمة مطابقة</h3>
          <p className="text-xs text-slate-500">سجل فاتورة مستلمة جديدة من الشركات والجهات الموردة.</p>
          <button
            onClick={onAddInvoice}
            className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold"
          >
            تسجيل فاتورة الآن
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredInvoices.map((inv) => {
            const isReceived = inv.receiptStatus === 'received';

            return (
              <div
                key={inv.id}
                className={`rounded-2xl border p-5 flex flex-col justify-between transition-all ${
                  isReceived
                    ? 'bg-slate-800/60 border-emerald-500/30'
                    : 'bg-slate-800/90 border-amber-500/40 shadow-lg'
                }`}
              >
                <div>
                  {/* Top Bar: Invoice Number & Manual Toggle */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold border font-mono tracking-wider bg-slate-900 text-slate-300 border-slate-700">
                      {inv.invoiceNumber}
                    </span>

                    {/* Quick Manual Toggle Button */}
                    <button
                      onClick={() => onToggleReceiptStatus(inv.id)}
                      className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 transition-all shadow-sm ${
                        isReceived
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                      }`}
                      title="انقر لتغيير حالة الاستلام يدوياً"
                    >
                      {isReceived ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>تم الاستلام</span>
                        </>
                      ) : (
                        <>
                          <Clock className="w-3.5 h-3.5 text-amber-400" />
                          <span>لم يتم الاستلام</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Issuer Name & Amount */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                      <Building2 className="w-3.5 h-3.5" />
                      <span>اسم الجهة:</span>
                    </div>
                    <h3 className="font-bold text-white text-base truncate" title={inv.sourceName}>
                      {inv.sourceName}
                    </h3>
                    <div className="text-2xl font-black text-white font-mono mt-1">
                      {formatCurrency(inv.amount)}
                    </div>
                  </div>

                  {/* Metadata: Date & Notes */}
                  <div className="mt-4 pt-3 border-t border-slate-700/60 space-y-1.5 text-xs text-slate-300">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>تاريخ الفاتورة:</span>
                      </span>
                      <span className="font-semibold text-slate-200">
                        {formatArabicDate(inv.invoiceDate)}
                      </span>
                    </div>

                    {inv.notes && (
                      <p className="text-[11px] text-slate-400 line-clamp-2 mt-1 bg-slate-900/40 p-2 rounded-lg">
                        {inv.notes}
                      </p>
                    )}
                  </div>
                </div>

                {/* Bottom Actions Bar */}
                <div className="mt-5 pt-3 border-t border-slate-700/60 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    {inv.image && (
                      <button
                        onClick={() => onPreviewImage(inv.image!, `فاتورة مستلمة ${inv.invoiceNumber}`)}
                        className="p-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl transition-colors text-xs flex items-center gap-1"
                        title="معاينة الفاتورة أو المستند"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>معاينة</span>
                      </button>
                    )}
                    <button
                      onClick={() => onEditInvoice(inv)}
                      className="p-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl transition-colors text-xs"
                      title="تعديل الفاتورة"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDeleteInvoice(inv.id)}
                      className="p-2 bg-slate-700 hover:bg-rose-900/60 text-slate-300 hover:text-rose-300 rounded-xl transition-colors text-xs"
                      title="حذف الفاتورة"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Manual Toggle Switch button */}
                  <button
                    onClick={() => onToggleReceiptStatus(inv.id)}
                    className="text-xs text-slate-400 hover:text-white underline font-medium"
                  >
                    تغيير إلى {isReceived ? 'لم يتم الاستلام' : 'تم الاستلام'}
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
