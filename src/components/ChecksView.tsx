import React, { useState, useMemo } from 'react';
import {
  CreditCard,
  Plus,
  Search,
  Filter,
  Check,
  Eye,
  Trash2,
  Edit2,
  Calendar,
  Building,
  FileText,
  AlertCircle,
  Clock,
  Sparkles,
  ArrowUpDown,
  Download,
} from 'lucide-react';
import { CheckItem, CheckStatus, Customer, CustomerInvoice } from '../types';
import { formatCurrency, formatArabicDate, CHECK_STATUS_CONFIG, getTodayString } from '../utils/checkCalculations';

interface ChecksViewProps {
  checks: CheckItem[];
  customers: Customer[];
  customerInvoices: CustomerInvoice[];
  onAddCheck: () => void;
  onEditCheck: (check: CheckItem) => void;
  onDeleteCheck: (id: string) => void;
  onCashCheck: (id: string) => void;
  onPreviewImage: (url: string, title: string) => void;
}

export const ChecksView: React.FC<ChecksViewProps> = ({
  checks,
  customers,
  customerInvoices,
  onAddCheck,
  onEditCheck,
  onDeleteCheck,
  onCashCheck,
  onPreviewImage,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [customerFilter, setCustomerFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [sortBy, setSortBy] = useState<'dueDate' | 'amount' | 'customer'>('dueDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Filter checks
  const filteredChecks = useMemo(() => {
    const today = getTodayString();

    return checks
      .filter((check) => {
        // Search filter (Check number, store name, invoice number, notes)
        if (searchTerm.trim()) {
          const term = searchTerm.toLowerCase();
          const matchNumber = check.checkNumber.toLowerCase().includes(term);
          const matchCustomer = check.customerName.toLowerCase().includes(term);
          const matchInvoice = check.linkedInvoiceNumber?.toLowerCase().includes(term) || false;
          const matchNotes = check.notes?.toLowerCase().includes(term) || false;
          if (!matchNumber && !matchCustomer && !matchInvoice && !matchNotes) {
            return false;
          }
        }

        // Status filter
        if (statusFilter !== 'all') {
          const s = check.status;
          if (statusFilter === 'upcoming' && s !== 'upcoming' && s !== 'قادم') return false;
          if (statusFilter === 'due_today' && s !== 'due_today' && s !== 'مستحق اليوم') return false;
          if (statusFilter === 'overdue' && s !== 'overdue' && s !== 'متأخر') return false;
          if (statusFilter === 'cashed' && s !== 'cashed' && s !== 'تم صرفه' && s !== 'مدفوع') return false;
          if (statusFilter === 'cancelled' && s !== 'cancelled' && s !== 'ملغي') return false;
        }

        // Customer filter
        if (customerFilter !== 'all' && check.customerId !== customerFilter) {
          return false;
        }

        // Date range filter
        if (dateRange === 'today') {
          if (check.dueDate !== today) return false;
        } else if (dateRange === 'week') {
          const d = new Date(check.dueDate);
          const now = new Date();
          const nextWeek = new Date();
          nextWeek.setDate(now.getDate() + 7);
          if (d < now || d > nextWeek) return false;
        } else if (dateRange === 'month') {
          const d = new Date(check.dueDate);
          const now = new Date();
          const nextMonth = new Date();
          nextMonth.setDate(now.getDate() + 30);
          if (d < now || d > nextMonth) return false;
        }

        return true;
      })
      .sort((a, b) => {
        let cmp = 0;
        if (sortBy === 'dueDate') {
          cmp = a.dueDate.localeCompare(b.dueDate);
        } else if (sortBy === 'amount') {
          cmp = a.amount - b.amount;
        } else if (sortBy === 'customer') {
          cmp = a.customerName.localeCompare(b.customerName, 'ar');
        }
        return sortOrder === 'asc' ? cmp : -cmp;
      });
  }, [checks, searchTerm, statusFilter, customerFilter, dateRange, sortBy, sortOrder]);

  const totalFilteredAmount = filteredChecks.reduce((sum, c) => sum + c.amount, 0);

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                الشيكات الصادرة من العملاء
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                تسجيل ومتابعة شيكات المحلات وتواريخ الصرف التلقائية والفواتير المرتبطة
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={onAddCheck}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 shadow-md shadow-blue-600/25 transition-all active:scale-95 self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>تسجيل شيك جديد</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="mobile-filter-panel bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* Search box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ابحث برقم الشيك، اسم المحل، الفاتورة..."
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl pr-9 pl-3 py-2 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:border-blue-500 placeholder:text-slate-400"
            />
          </div>

          {/* Status filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="all">كل حالات الشيكات ({checks.length})</option>
              <option value="upcoming">قادم</option>
              <option value="due_today">مستحق اليوم</option>
              <option value="overdue">متأخر</option>
              <option value="cashed">تم صرفه</option>
              <option value="cancelled">ملغي</option>
            </select>
          </div>

          {/* Customer filter */}
          <div>
            <select
              value={customerFilter}
              onChange={(e) => setCustomerFilter(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="all">جميع المحلات والعملاء</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date range filter */}
          <div>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as any)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="all">كل التواريخ</option>
              <option value="today">مستحق اليوم فقط</option>
              <option value="week">خلال الأسبوع القادم</option>
              <option value="month">خلال الشهر القادم</option>
            </select>
          </div>
        </div>

        {/* Status badges quick toggle */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-slate-800 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-slate-500 dark:text-slate-400 text-xs ml-1">تصفية سريعة:</span>
            {(['all', 'upcoming', 'due_today', 'overdue', 'cashed', 'cancelled'] as const).map((st) => {
              const label =
                st === 'all'
                  ? 'الكل'
                  : CHECK_STATUS_CONFIG[st as CheckStatus]?.label || st;
              const count =
                st === 'all'
                  ? checks.length
                  : checks.filter((c) => {
                      if (st === 'upcoming') return c.status === 'upcoming' || c.status === 'قادم';
                      if (st === 'due_today') return c.status === 'due_today' || c.status === 'مستحق اليوم';
                      if (st === 'overdue') return c.status === 'overdue' || c.status === 'متأخر';
                      if (st === 'cashed') return c.status === 'cashed' || c.status === 'تم صرفه' || c.status === 'مدفوع';
                      if (st === 'cancelled') return c.status === 'cancelled' || c.status === 'ملغي';
                      return c.status === st;
                    }).length;

              return (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                    statusFilter === st
                      ? 'bg-blue-600 text-white font-bold shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {label} ({count})
                </button>
              );
            })}
          </div>

          <div className="text-slate-600 dark:text-slate-300 font-medium">
            الإجمالي في العرض:{' '}
            <span className="text-emerald-600 dark:text-emerald-400 font-bold font-mono">
              {formatCurrency(totalFilteredAmount)}
            </span>
          </div>
        </div>
      </div>

      {/* Checks Grid / Table */}
      {filteredChecks.length === 0 ? (
        <div className="bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-12 text-center space-y-3 shadow-xs">
          <CreditCard className="w-12 h-12 mx-auto text-slate-400 dark:text-slate-500" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-300">لا توجد شيكات مطابقة لمعايير البحث</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">جرب تعديل الفلاتر أو تسجيل شيك جديد.</p>
          <button
            onClick={onAddCheck}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-xs"
          >
            تسجيل شيك الآن
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredChecks.map((chk) => {
            const cfg = CHECK_STATUS_CONFIG[chk.status] || CHECK_STATUS_CONFIG['قادم'];
            const isCashed = chk.status === 'cashed' || chk.status === 'مدفوع' || chk.status === 'تم صرفه';

            return (
              <div
                key={chk.id}
                className={`rounded-2xl border transition-all p-5 flex flex-col justify-between shadow-xs ${
                  isCashed
                    ? 'bg-slate-50/80 dark:bg-slate-800/40 border-emerald-500/20'
                    : chk.status === 'due_today' || chk.status === 'مستحق اليوم'
                    ? 'bg-amber-50/30 dark:bg-slate-800/90 border-amber-500/50 shadow-md ring-1 ring-amber-500/30'
                    : chk.status === 'overdue' || chk.status === 'متأخر'
                    ? 'bg-rose-50/30 dark:bg-slate-800/90 border-rose-500/40 shadow-md ring-1 ring-rose-500/30'
                    : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/80'
                }`}
              >
                <div>
                  {/* Top Bar: Status & Check Number */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold border font-mono tracking-wider bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700">
                      {chk.checkNumber}
                    </span>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${cfg.badgeBg}`}>
                      {cfg.label}
                    </span>
                  </div>

                  {/* Store Name & Amount */}
                  <div className="space-y-1">
                    <h3 className="font-bold text-slate-900 dark:text-white text-base truncate" title={chk.customerName}>
                      {chk.customerName}
                    </h3>
                    <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                      {formatCurrency(chk.amount)}
                    </div>
                  </div>

                  {/* Metadata: Due Date */}
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>تاريخ الاستحقاق:</span>
                      </span>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {formatArabicDate(chk.dueDate)}
                      </span>
                    </div>

                    {chk.linkedInvoiceNumber && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5 text-blue-500" />
                          <span>الفاتورة المرتبطة:</span>
                        </span>
                        <span className="text-blue-600 dark:text-blue-300 font-mono">{chk.linkedInvoiceNumber}</span>
                      </div>
                    )}

                    {chk.notes && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-1 bg-slate-50 dark:bg-slate-900/40 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                        {chk.notes}
                      </p>
                    )}
                  </div>
                </div>

                {/* Bottom Actions Bar */}
                <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    {chk.image && (
                      <button
                        onClick={() => onPreviewImage(chk.image!, `صورة شيك ${chk.checkNumber}`)}
                        className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl transition-colors text-xs flex items-center gap-1 cursor-pointer"
                        title="معاينة صورة الشيك"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>معاينة</span>
                      </button>
                    )}
                    <button
                      onClick={() => onEditCheck(chk)}
                      className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl transition-colors text-xs cursor-pointer"
                      title="تعديل الشيك"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDeleteCheck(chk.id)}
                      className="p-2 bg-slate-100 hover:bg-rose-100 dark:bg-slate-700 dark:hover:bg-rose-900/60 text-slate-600 hover:text-rose-600 dark:text-slate-300 dark:hover:text-rose-300 rounded-xl transition-colors text-xs cursor-pointer"
                      title="حذف الشيك"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Cash Check Button */}
                  {!isCashed ? (
                    <button
                      onClick={() => onCashCheck(chk.id)}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-emerald-600/20 transition-all active:scale-95 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>صرف الشيك</span>
                    </button>
                  ) : (
                    <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-200 dark:border-emerald-500/20 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      <span>تم الصرف</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
