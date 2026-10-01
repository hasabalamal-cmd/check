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
  check: Pick<CheckItem, 'dueDate' | 'manualStatus'> & { status?: string },
  todayStr: string = getTodayString()
): CheckStatus => {
  // If explicitly cashed, paid, or cancelled, respect manual choice
  if (check.manualStatus === 'cashed' || check.manualStatus === 'مدفوع' || check.status === 'مدفوع' || check.status === 'cashed') {
    return 'مدفوع';
  }
  if (check.manualStatus === 'cancelled' || check.manualStatus === 'ملغي' || check.status === 'ملغي' || check.status === 'cancelled') {
    return 'ملغي';
  }

  const daysDiff = getDaysDifference(check.dueDate, todayStr);

  if (daysDiff < 0) {
    return 'متأخر'; // متأخر
  } else if (daysDiff === 0) {
    return 'مستحق اليوم'; // مستحق اليوم
  } else {
    return 'قادم'; // قادم
  }
};

/**
 * Format currency in US Dollar ($) with professional number formatting
 */
export const formatCurrency = (amount: number): string => {
  const num = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
  return '$' + new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
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
  string,
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
    label: 'مدفوع',
    bg: 'bg-emerald-50 dark:bg-emerald-500/10',
    text: 'text-emerald-700 dark:text-emerald-400',
    border: 'border-emerald-200 dark:border-emerald-500/30',
    badgeBg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/40',
    badgeText: 'text-emerald-700 dark:text-emerald-400',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
  },
  مدفوع: {
    label: 'مدفوع',
    bg: 'bg-emerald-50 dark:bg-emerald-500/10',
    text: 'text-emerald-700 dark:text-emerald-400',
    border: 'border-emerald-200 dark:border-emerald-500/30',
    badgeBg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/40',
    badgeText: 'text-emerald-700 dark:text-emerald-400',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
  },
  'تم صرفه': {
    label: 'مدفوع',
    bg: 'bg-emerald-50 dark:bg-emerald-500/10',
    text: 'text-emerald-700 dark:text-emerald-400',
    border: 'border-emerald-200 dark:border-emerald-500/30',
    badgeBg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/40',
    badgeText: 'text-emerald-700 dark:text-emerald-400',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
  },
  due_today: {
    label: 'مستحق اليوم',
    bg: 'bg-amber-50 dark:bg-amber-500/15',
    text: 'text-amber-800 dark:text-amber-400',
    border: 'border-amber-200 dark:border-amber-500/40',
    badgeBg: 'bg-amber-100 text-amber-800 dark:bg-amber-500/25 dark:text-amber-200 border-amber-300 dark:border-amber-500/50',
    badgeText: 'text-amber-700 dark:text-amber-400',
    iconColor: 'text-amber-600 dark:text-amber-400',
  },
  'مستحق اليوم': {
    label: 'مستحق اليوم',
    bg: 'bg-amber-50 dark:bg-amber-500/15',
    text: 'text-amber-800 dark:text-amber-400',
    border: 'border-amber-200 dark:border-amber-500/40',
    badgeBg: 'bg-amber-100 text-amber-800 dark:bg-amber-500/25 dark:text-amber-200 border-amber-300 dark:border-amber-500/50',
    badgeText: 'text-amber-700 dark:text-amber-400',
    iconColor: 'text-amber-600 dark:text-amber-400',
  },
  upcoming: {
    label: 'قادم',
    bg: 'bg-blue-50 dark:bg-blue-500/10',
    text: 'text-blue-700 dark:text-blue-400',
    border: 'border-blue-200 dark:border-blue-500/30',
    badgeBg: 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300 border-blue-300 dark:border-blue-500/40',
    badgeText: 'text-blue-700 dark:text-blue-400',
    iconColor: 'text-blue-600 dark:text-blue-400',
  },
  قادم: {
    label: 'قادم',
    bg: 'bg-blue-50 dark:bg-blue-500/10',
    text: 'text-blue-700 dark:text-blue-400',
    border: 'border-blue-200 dark:border-blue-500/30',
    badgeBg: 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300 border-blue-300 dark:border-blue-500/40',
    badgeText: 'text-blue-700 dark:text-blue-400',
    iconColor: 'text-blue-600 dark:text-blue-400',
  },
  overdue: {
    label: 'متأخر',
    bg: 'bg-rose-50 dark:bg-rose-500/15',
    text: 'text-rose-700 dark:text-rose-400',
    border: 'border-rose-200 dark:border-rose-500/40',
    badgeBg: 'bg-rose-100 text-rose-800 dark:bg-rose-500/25 dark:text-rose-200 border-rose-300 dark:border-rose-500/50',
    badgeText: 'text-rose-700 dark:text-rose-400',
    iconColor: 'text-rose-600 dark:text-rose-400',
  },
  متأخر: {
    label: 'متأخر',
    bg: 'bg-rose-50 dark:bg-rose-500/15',
    text: 'text-rose-700 dark:text-rose-400',
    border: 'border-rose-200 dark:border-rose-500/40',
    badgeBg: 'bg-rose-100 text-rose-800 dark:bg-rose-500/25 dark:text-rose-200 border-rose-300 dark:border-rose-500/50',
    badgeText: 'text-rose-700 dark:text-rose-400',
    iconColor: 'text-rose-600 dark:text-rose-400',
  },
  cancelled: {
    label: 'ملغي',
    bg: 'bg-slate-100 dark:bg-slate-800/50',
    text: 'text-slate-600 dark:text-slate-400',
    border: 'border-slate-200 dark:border-slate-700/50',
    badgeBg: 'bg-slate-200 text-slate-800 dark:bg-slate-700/50 dark:text-slate-300 border-slate-300 dark:border-slate-600/40',
    badgeText: 'text-slate-600 dark:text-slate-400',
    iconColor: 'text-slate-500 dark:text-slate-400',
  },
  ملغي: {
    label: 'ملغي',
    bg: 'bg-slate-100 dark:bg-slate-800/50',
    text: 'text-slate-600 dark:text-slate-400',
    border: 'border-slate-200 dark:border-slate-700/50',
    badgeBg: 'bg-slate-200 text-slate-800 dark:bg-slate-700/50 dark:text-slate-300 border-slate-300 dark:border-slate-600/40',
    badgeText: 'text-slate-600 dark:text-slate-400',
    iconColor: 'text-slate-500 dark:text-slate-400',
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
    if (
      check.manualStatus === 'cashed' ||
      check.manualStatus === 'مدفوع' ||
      check.status === 'cashed' ||
      check.status === 'مدفوع' ||
      check.manualStatus === 'cancelled' ||
      check.manualStatus === 'ملغي' ||
      check.status === 'cancelled' ||
      check.status === 'ملغي'
    ) {
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

  return sortAlertsByClosest(alerts);
};

/**
 * Sort notifications so the closest / most urgent alert appears first
 * Priority order:
 * 1. Due Today (daysRemaining === 0)
 * 2. Overdue (daysRemaining < 0) - urgent past due
 * 3. In 1 day (daysRemaining === 1)
 * 4. In 3 days (daysRemaining === 3)
 * 5. In 7 days (daysRemaining === 7)
 */
export const sortAlertsByClosest = (alerts: AlertNotification[]): AlertNotification[] => {
  return [...alerts].sort((a, b) => {
    const getUrgencyScore = (item: AlertNotification) => {
      // 0 = Due today (immediate top urgency)
      if (item.daysRemaining === 0) return 0;
      // Overdue is past due - urgent! (score between 0.01 and 0.99 so today is first, overdue next, or overdue first)
      if (item.daysRemaining < 0) return 0.05 + Math.abs(item.daysRemaining) * 0.01;
      // Upcoming: 1 day (score 1), 3 days (score 3), 7 days (score 7)
      return item.daysRemaining;
    };

    const diff = getUrgencyScore(a) - getUrgencyScore(b);
    if (diff !== 0) return diff;

    // Unread first if same urgency
    if (a.isRead !== b.isRead) return a.isRead ? 1 : -1;

    // Latest created timestamp first
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });
};

