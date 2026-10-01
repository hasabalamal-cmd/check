import React from 'react';
import {
  Clock,
  CheckCircle2,
  CreditCard,
  AlertCircle,
  PlusCircle,
  ArrowUpRight,
  Sparkles,
  AlertTriangle,
  Eye,
  Check,
  FileText,
} from 'lucide-react';
import { Customer, CheckItem, CustomerInvoice, ReceivedInvoice } from '../types';
import { formatCurrency, formatArabicDate, CHECK_STATUS_CONFIG } from '../utils/checkCalculations';

interface DashboardProps {
  checks: CheckItem[];
  receivedInvoices: ReceivedInvoice[];
  customerInvoices: CustomerInvoice[];
  customers: Customer[];
  onToggleReceiptStatus: (id: string) => void;
  onCashCheck: (id: string) => void;
  onOpenCheckModal: () => void;
  onOpenReceivedInvoiceModal: () => void;
  onNavigateTab: (tab: string) => void;
  onPreviewImage: (url: string, title: string) => void;
  currentShopName?: string;
}

export const Dashboard: React.FC<DashboardProps> = ({
  checks,
  receivedInvoices,
  onToggleReceiptStatus,
  onCashCheck,
  onOpenCheckModal,
  onOpenReceivedInvoiceModal,
  onNavigateTab,
  onPreviewImage,
  currentShopName = 'Bunn',
}) => {
  // 1. Unreceived Invoices Stats (لم يتم استلام مستحقها)
  const unreceivedInvoices = receivedInvoices.filter(
    (inv) => inv.receiptStatus === 'not_received' || inv.receiptStatus === 'لم يتم الاستلام'
  );
  const totalUnreceivedAmount = unreceivedInvoices.reduce((sum, inv) => sum + inv.amount, 0);
  const countUnreceivedInvoices = unreceivedInvoices.length;

  // 2. Received Invoices Stats (الفواتير المستلمة)
  const receivedInvoicesList = receivedInvoices.filter(
    (inv) => inv.receiptStatus === 'received' || inv.receiptStatus === 'تم الاستلام'
  );
  const totalReceivedAmount = receivedInvoicesList.reduce((sum, inv) => sum + inv.amount, 0);
  const countReceivedInvoices = receivedInvoicesList.length;

  // 3. Upcoming Checks (الشيكات القادمة)
  const upcomingChecks = checks.filter(
    (c) => c.status === 'upcoming' || c.status === 'قادم'
  );
  const totalUpcomingChecksAmount = upcomingChecks.reduce((sum, c) => sum + c.amount, 0);
  const countUpcomingChecks = upcomingChecks.length;

  // 4. Due Today Checks (الشيكات المستحقة اليوم)
  const dueTodayChecks = checks.filter(
    (c) => c.status === 'due_today' || c.status === 'مستحق اليوم'
  );
  const totalDueTodayAmount = dueTodayChecks.reduce((sum, c) => sum + c.amount, 0);
  const countDueTodayChecks = dueTodayChecks.length;

  // 5. Overdue Checks (الشيكات المتأخرة)
  const overdueChecks = checks.filter(
    (c) => c.status === 'overdue' || c.status === 'متأخر'
  );
  const totalOverdueAmount = overdueChecks.reduce((sum, c) => sum + c.amount, 0);
  const countOverdueChecks = overdueChecks.length;

  // Urgent attention needed (due today + overdue)
  const urgentChecks = [...dueTodayChecks, ...overdueChecks];

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome with Quick Actions */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-l from-slate-900 via-slate-800 to-indigo-950 p-6 border border-slate-700/60 shadow-xl text-white">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>لوحة التحكم المالية • {currentShopName}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {currentShopName}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
              إدارة ومتابعة الشيكات القادمة والمستحقة، وتحصيل فواتير العملاء والفواتير المستلمة لـ {currentShopName}.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={onOpenCheckModal}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 shadow-lg shadow-blue-600/30 transition-all active:scale-95 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>تسجيل شيك جديد</span>
            </button>
            <button
              onClick={onOpenReceivedInvoiceModal}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all active:scale-95 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>تسجيل فاتورة مستلمة</span>
            </button>
          </div>
        </div>

        {/* Ambient background glow */}
        <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* ========================================================
          THE 8 PRIMARY REQUIRED KPI METRICS CARDS
         ======================================================== */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span>المؤشرات المالية الرئيسية</span>
            <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
              (تتحدث تلقائيًا مع أي تغيير في الحالات)
            </span>
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1 & 2: الفواتير التي لم يتم استلام مستحقها */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-amber-500/30 shadow-sm hover:shadow-md hover:border-amber-500/50 transition-all relative overflow-hidden group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">الفواتير المستلمة</span>
              <div className="p-2 bg-amber-500/15 text-amber-600 dark:text-amber-400 rounded-xl">
                <Clock className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">لم يتم استلام مستحقها</div>
              <div className="text-2xl font-black text-amber-600 dark:text-amber-300 font-mono mt-1">
                {formatCurrency(totalUnreceivedAmount)}
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">عدد الفواتير غير المستلمة:</span>
              <span className="font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-500/20 px-2 py-0.5 rounded-full font-mono">
                {countUnreceivedInvoices} فواتير
              </span>
            </div>
          </div>

          {/* 3 & 4: الفواتير التي تم استلام مستحقها */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-500/30 shadow-sm hover:shadow-md hover:border-emerald-500/50 transition-all relative overflow-hidden group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">الفواتير المستلمة</span>
              <div className="p-2 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 rounded-xl">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">تم استلام مستحقها</div>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono mt-1">
                {formatCurrency(totalReceivedAmount)}
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">عدد الفواتير المستلمة:</span>
              <span className="font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-500/20 px-2 py-0.5 rounded-full font-mono">
                {countReceivedInvoices} فواتير
              </span>
            </div>
          </div>

          {/* 5 & 6: إجمالي مبالغ الشيكات القادمة وعددها */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-blue-500/30 shadow-sm hover:shadow-md hover:border-blue-500/50 transition-all relative overflow-hidden group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-blue-700 dark:text-blue-400">شيكات العملاء</span>
              <div className="p-2 bg-blue-500/15 text-blue-600 dark:text-blue-400 rounded-xl">
                <CreditCard className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">الشيكات القادمة</div>
              <div className="text-2xl font-black text-blue-600 dark:text-blue-400 font-mono mt-1">
                {formatCurrency(totalUpcomingChecksAmount)}
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">عدد الشيكات القادمة:</span>
              <span className="font-bold text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-500/20 px-2 py-0.5 rounded-full font-mono">
                {countUpcomingChecks} شيكات
              </span>
            </div>
          </div>

          {/* 7 & 8: الشيكات المستحقة اليوم والمتأخرة */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-rose-500/30 shadow-sm hover:shadow-md hover:border-rose-500/50 transition-all relative overflow-hidden group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-rose-700 dark:text-rose-400">شيكات بحاجة لإجراء</span>
              <div className="p-2 bg-rose-500/15 text-rose-600 dark:text-rose-400 rounded-xl">
                <AlertCircle className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="p-2 bg-amber-50 dark:bg-amber-500/10 rounded-xl border border-amber-200 dark:border-amber-500/20">
                <div className="text-[11px] text-amber-700 dark:text-amber-300 font-medium">مستحق اليوم</div>
                <div className="text-base font-bold text-slate-900 dark:text-white font-mono mt-0.5">
                  {countDueTodayChecks} شيك
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5 truncate">
                  {formatCurrency(totalDueTodayAmount)}
                </div>
              </div>
              <div className="p-2 bg-rose-50 dark:bg-rose-500/10 rounded-xl border border-rose-200 dark:border-rose-500/20">
                <div className="text-[11px] text-rose-700 dark:text-rose-300 font-medium">متأخر</div>
                <div className="text-base font-bold text-rose-600 dark:text-rose-300 font-mono mt-0.5">
                  {countOverdueChecks} شيك
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5 truncate">
                  {formatCurrency(totalOverdueAmount)}
                </div>
              </div>
            </div>
            <div className="mt-2 text-right">
              <button
                onClick={() => onNavigateTab('checks')}
                className="text-[11px] text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white inline-flex items-center gap-1 transition-colors cursor-pointer"
              >
                <span>عرض قائمة الشيكات الكاملة</span>
                <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Urgent Checks Notice Banner if any */}
      {urgentChecks.length > 0 && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-rose-500/15 to-amber-500/10 border border-amber-500/40 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-500/20 text-amber-700 dark:text-amber-300 rounded-xl mt-0.5 shrink-0">
                <AlertTriangle className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  يوجد {urgentChecks.length} شيك يتطلب انتباهك الفوري اليوم
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                  شيكات مستحقة اليوم أو متأخرة عن تاريخ استحقاقها ولم يتم تسجيل صرفها بعد.
                </p>
              </div>
            </div>
            <button
              onClick={() => onNavigateTab('checks')}
              className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs whitespace-nowrap shadow transition-all active:scale-95 cursor-pointer self-start sm:self-auto"
            >
              متابعة الشيكات
            </button>
          </div>

          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {urgentChecks.map((chk) => (
              <div
                key={chk.id}
                className="p-3 bg-white dark:bg-slate-900/90 rounded-xl border border-slate-200 dark:border-slate-700/80 flex items-center justify-between text-xs shadow-xs"
              >
                <div className="min-w-0 pr-2">
                  <div className="font-bold text-slate-900 dark:text-white truncate">{chk.customerName}</div>
                  <div className="text-emerald-600 dark:text-emerald-400 font-mono font-semibold">
                    {formatCurrency(chk.amount)}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1">
                    <span className="font-mono">{chk.checkNumber}</span>
                    <span>•</span>
                    <span className={chk.status === 'overdue' ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'}>
                      {formatArabicDate(chk.dueDate)}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => onCashCheck(chk.id)}
                  className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-600/30 dark:hover:bg-emerald-600 text-emerald-700 dark:text-emerald-300 hover:text-emerald-900 dark:hover:text-white border border-emerald-300 dark:border-emerald-500/40 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors shrink-0 cursor-pointer"
                  title="تم صرف الشيك"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>صرف</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Two Columns: Recent Checks vs Received Invoices */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Column 1: Customer Checks Quick View */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg">
                <CreditCard className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">أحدث شيكات العملاء</h3>
            </div>
            <button
              onClick={() => onNavigateTab('checks')}
              className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium flex items-center gap-1 cursor-pointer"
            >
              <span>عرض الكل</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5 flex-1">
            {checks.slice(0, 5).map((chk) => {
              const cfg = CHECK_STATUS_CONFIG[chk.status] || CHECK_STATUS_CONFIG['قادم'];
              return (
                <div
                  key={chk.id}
                  className="p-3 bg-slate-50/80 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/50 rounded-xl flex items-center justify-between transition-colors text-xs"
                >
                  <div className="space-y-0.5 min-w-0 pr-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900 dark:text-white truncate">{chk.customerName}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${cfg.badgeBg}`}>
                        {cfg.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-[11px]">
                      <span className="font-mono">{chk.checkNumber}</span>
                      <span>•</span>
                      <span>استحقاق: {formatArabicDate(chk.dueDate)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm">
                      {formatCurrency(chk.amount)}
                    </span>
                    {chk.status !== 'cashed' && chk.status !== 'مدفوع' && (
                      <button
                        onClick={() => onCashCheck(chk.id)}
                        className="p-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30 rounded-lg transition-colors cursor-pointer"
                        title="تأكيد الصرف"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {chk.image && (
                      <button
                        onClick={() => onPreviewImage(chk.image!, `صورة شيك رقم ${chk.checkNumber}`)}
                        className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg transition-colors cursor-pointer"
                        title="معاينة الشيك"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Column 2: Received Invoices Quick View */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg">
                <FileText className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">الفواتير المستلمة (تغيير فوري)</h3>
            </div>
            <button
              onClick={() => onNavigateTab('received_invoices')}
              className="text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium flex items-center gap-1 cursor-pointer"
            >
              <span>عرض الكل</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5 flex-1">
            {receivedInvoices.slice(0, 5).map((rinv) => {
              const isReceived = rinv.receiptStatus === 'received' || rinv.receiptStatus === 'تم الاستلام';
              return (
                <div
                  key={rinv.id}
                  className="p-3 bg-slate-50/80 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/50 rounded-xl flex items-center justify-between transition-colors text-xs"
                >
                  <div className="space-y-0.5 min-w-0 pr-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900 dark:text-white truncate">{rinv.sourceName}</span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">({rinv.invoiceNumber})</span>
                    </div>
                    <div className="text-slate-500 dark:text-slate-400 text-[11px]">
                      تاريخ: {formatArabicDate(rinv.invoiceDate)}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                    <span className="font-mono font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                      {formatCurrency(rinv.amount)}
                    </span>

                    {/* Manual Status Toggle Button */}
                    <button
                      onClick={() => onToggleReceiptStatus(rinv.id)}
                      className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1.5 transition-all cursor-pointer ${
                        isReceived
                          ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/40 hover:bg-emerald-100'
                          : 'bg-amber-50 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-500/40 hover:bg-amber-100'
                      }`}
                      title="انقر لتغيير حالة الاستلام يدوياً"
                    >
                      {isReceived ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span className="hidden xs:inline">تم الاستلام</span>
                        </>
                      ) : (
                        <>
                          <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                          <span className="hidden xs:inline">لم يتم الاستلام</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
