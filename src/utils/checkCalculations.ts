import { CheckItem, CheckStatus, AlertNotification } from '../types';

/**
 * Returns formatted date string in YYYY-MM-DD
 */
export const getTodayString = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Calculates the difference in full days between target date and today.
 * Positive means days remaining in future.
 * 0 means today.
 * Negative means days overdue.
 */
export const getDaysDifference = (targetDateStr: string, fromDateStr: string = getTodayString()): number => {
  const [tY, tM, tD] = targetDateStr.split('-').map(Number);
  const [fY, fM, fD] = fromDateStr.split('-').map(Number);

  const targetDate = new Date(tY, tM - 1, tD);
  const fromDate = new Date(fY, fM - 1, fD);

  const diffTime = targetDate.getTime() - fromDate.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Calculate dynamic status for a check based on due date and manual override.
 */
export const computeCheckStatus = (
  check: Pick<CheckItem, 'dueDate' | 'manualStatus'>,
  todayStr: string = getTodayString()
): CheckStatus => {
  // If explicitly cashed or cancelled, respect manual choice
  if (check.manualStatus === 'cashed') return 'cashed';
  if (check.manualStatus === 'cancelled') return 'cancelled';

  const daysDiff = getDaysDifference(check.dueDate, todayStr);

  if (daysDiff < 0) {
    return 'overdue'; // متأخر
  } else if (daysDiff === 0) {
    return 'due_today'; // مستحق اليوم
  } else {
    return 'upcoming'; // قادم
  }
};

/**
 * Format currency in Saudi Riyal
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('ar-SA', {
    style: 'decimal',
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(amount) + ' ر.س';
};

/**
 * Format date in Arabic friendly format (e.g. 15 أكتوبر 2026)
 */
export const formatArabicDate = (dateStr: string): string => {
  if (!dateStr) return '';
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return new Intl.DateTimeFormat('ar-SA', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
  } catch {
    return dateStr;
  }
};

/**
 * Human readable status labels & styling config in Arabic
 */
export const CHECK_STATUS_CONFIG: Record<
  CheckStatus,
  {
    label: string;
    bg: string;
    text: string;
    border: string;
    badgeBg: string;
    badgeText: string;
    iconColor: string;
  }
> = {
  cashed: {
    label: 'تم صرفه',
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    border: 'border-emerald-500/30',
    badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    badgeText: 'text-emerald-400',
    iconColor: 'text-emerald-400',
  },
  due_today: {
    label: 'مستحق اليوم',
    bg: 'bg-amber-500/15',
    text: 'text-amber-400',
    border: 'border-amber-500/40',
    badgeBg: 'bg-amber-500/25 text-amber-200 border-amber-500/50',
    badgeText: 'text-amber-400',
    iconColor: 'text-amber-400',
  },
  upcoming: {
    label: 'قادم',
    bg: 'bg-blue-500/10',
    text: 'text-blue-400',
    border: 'border-blue-500/30',
    badgeBg: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    badgeText: 'text-blue-400',
    iconColor: 'text-blue-400',
  },
  overdue: {
    label: 'متأخر',
    bg: 'bg-rose-500/15',
    text: 'text-rose-400',
    border: 'border-rose-500/40',
    badgeBg: 'bg-rose-500/25 text-rose-200 border-rose-500/50',
    badgeText: 'text-rose-400',
    iconColor: 'text-rose-400',
  },
  cancelled: {
    label: 'ملغي',
    bg: 'bg-slate-700/40',
    text: 'text-slate-400',
    border: 'border-slate-600/30',
    badgeBg: 'bg-slate-700/50 text-slate-300 border-slate-600/40',
    badgeText: 'text-slate-400',
    iconColor: 'text-slate-400',
  },
};

/**
 * Generate check notifications based on scheduled rules:
 * - 7 days before
 * - 3 days before
 * - 1 day before
 * - Day of due date
 * - Overdue
 */
export const evaluateCheckNotifications = (
  checks: CheckItem[],
  todayStr: string = getTodayString()
): AlertNotification[] => {
  const alerts: AlertNotification[] = [];

  checks.forEach((check) => {
    // Only uncashed and uncancelled checks trigger alerts
    if (check.manualStatus === 'cashed' || check.manualStatus === 'cancelled') {
      return;
    }

    const daysRemaining = getDaysDifference(check.dueDate, todayStr);
    const dateFormatted = formatArabicDate(check.dueDate);
    const amountFormatted = formatCurrency(check.amount);

    let type: AlertNotification['type'] | null = null;
    let daysText = '';

    if (daysRemaining === 7) {
      type = '7_days';
      daysText = 'متبقي 7 أيام';
    } else if (daysRemaining === 3) {
      type = '3_days';
      daysText = 'متبقي 3 أيام';
    } else if (daysRemaining === 1) {
      type = '1_day';
      daysText = 'متبقي يوم واحد';
    } else if (daysRemaining === 0) {
      type = 'today';
      daysText = 'مستحق اليوم!';
    } else if (daysRemaining < 0) {
      type = 'overdue';
      daysText = `متأخر منذ ${Math.abs(daysRemaining)} يوم`;
    }

    if (type) {
      const message = `تنبيه شيك ${daysRemaining <= 0 ? 'مستحق' : 'قادم'}\nالمحل: ${check.customerName}\nالمبلغ: ${amountFormatted}\nتاريخ الاستحقاق: ${dateFormatted}\n${daysText}`;

      alerts.push({
        id: `alert-${check.id}-${type}-${todayStr}`,
        checkId: check.id,
        storeName: check.customerName,
        amount: check.amount,
        dueDate: check.dueDate,
        daysRemaining,
        message,
        timestamp: new Date().toISOString(),
        type,
        isRead: false,
      });
    }
  });

  return alerts;
};
