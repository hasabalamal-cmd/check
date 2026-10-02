import React from 'react';
import { translate } from '../utils/i18n';
import {
  X,
  Bell,
  CheckCircle2,
  Clock,
  AlertTriangle,
  AlertCircle,
  Play,
  Check,
  Send,
  Trash2,
  Sparkles,
} from 'lucide-react';
import { AlertNotification } from '../types';
import { getLanguage } from '../utils/i18n';
import {
  formatCurrency,
  formatLocalizedDate,
  sortAlertsByClosest,
} from '../utils/checkCalculations';

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: AlertNotification[];
  onMarkAllAsRead: () => void;
  onMarkAsRead: (id: string) => void;
  onRunBotScan: () => void;
  hasBrowserPermission: boolean;
  onRequestBrowserPermission: () => void;
  onCashCheck: (checkId: string) => void;
  onDeleteNotification: (id: string) => void;
  onClearAllNotifications?: () => void;
}

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAllAsRead,
  onMarkAsRead,
  onRunBotScan,
  hasBrowserPermission,
  onRequestBrowserPermission,
  onCashCheck,
  onDeleteNotification,
  onClearAllNotifications,
}) => {
  if (!isOpen) return null;

  // Closest alert appears first
  const sortedAlerts = sortAlertsByClosest(notifications);
  const unreadCount = sortedAlerts.filter((n) => !n.isRead).length;

  const getAlertBadge = (type: AlertNotification['type'], daysRemaining: number) => {
    switch (type) {
      case 'today':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-400" />
            <span>{translate("مستحق اليوم")}</span>
          </span>
        );
      case 'overdue':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1">
            <AlertCircle className="w-3 h-3 text-rose-400" />
            <span>{translate(`متأخر (${Math.abs(daysRemaining)} يوم)`)}</span>
          </span>
        );
      case '1_day':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-orange-500/20 text-orange-300 border border-orange-500/40 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-orange-400" />
            <span>{translate("غداً (متبقي يوم)")}</span>
          </span>
        );
      case '3_days':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300 border border-blue-500/40 flex items-center gap-1">
            <Clock className="w-3 h-3 text-blue-400" />
            <span>{translate("متبقي 3 أيام")}</span>
          </span>
        );
      case '7_days':
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center gap-1">
            <Clock className="w-3 h-3 text-cyan-400" />
            <span>{translate("متبقي 7 أيام")}</span>
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in overflow-y-auto">
      <div className="relative max-w-xl w-full bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-8 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/95">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/15 text-amber-400 rounded-xl relative">
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center shadow">
                  {unreadCount}
                </span>
              )}
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">
                {translate("مركز التنبيهات والأتمتة الذكية")}
              </h3>
              <p className="text-xs text-slate-400">
                {translate("متابعة آلية لمواعيد استحقاق الشيكات وإرسال الإشعارات")}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
            title={translate("إغلاق")}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Bot Controls Bar */}
        <div className="p-4 bg-slate-800/60 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={onRunBotScan}
              className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-sm shadow-amber-500/20 transition-all active:scale-95 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{translate("تشغيل فحص الشيكات الآن")}</span>
            </button>

            {!hasBrowserPermission && (
              <button
                onClick={onRequestBrowserPermission}
                className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-200 rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Send className="w-3.5 h-3.5 text-blue-400" />
                <span>{translate("تفعيل إشعارات المتصفح")}</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={onMarkAllAsRead}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors px-2 py-1 rounded hover:bg-slate-800 cursor-pointer"
                title={translate("تحديد كل الإشعارات كمقروءة")}
              >
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>{translate("تحديد الكل كمقروء")}</span>
              </button>
            )}

            {sortedAlerts.length > 0 && onClearAllNotifications && (
              <button
                onClick={onClearAllNotifications}
                className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 transition-colors px-2 py-1 rounded hover:bg-rose-950/40 cursor-pointer"
                title={translate("حذف جميع التنبيهات من القائمة")}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{translate("مسح الكل")}</span>
              </button>
            )}
          </div>
        </div>

        {/* Schedule Explanation Card */}
        <div className="mx-6 mt-4 p-3 bg-slate-800/40 rounded-xl border border-slate-700/50 text-[11px] text-slate-300 flex items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-semibold text-slate-200">{translate("نظام الفحص اليومي النشط (الأقرب استحقاقاً أولاً):")}</span>
            <span className="text-slate-400">
              يوم الاستحقاق • قبل يوم • قبل 3 أيام • قبل 7 أيام
            </span>
          </div>
        </div>

        {/* Notifications List - Sorted with Closest First */}
        <div className="p-6 overflow-y-auto flex-1 space-y-3">
          {sortedAlerts.length === 0 ? (
            <div className="text-center py-12 text-slate-500 space-y-2">
              <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-500/50" />
              <p className="text-sm font-medium text-slate-300">
                {translate("لا توجد تنبيهات جديدة حاليًا")}
              </p>
              <p className="text-xs text-slate-500">
                {translate("جميع الشيكات إما تم صرفها أو مواعيد استحقاقها بعيدة عن فترات التنبيه.")}
              </p>
            </div>
          ) : (
            sortedAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-4 rounded-xl border transition-all ${
                  alert.isRead
                    ? 'bg-slate-800/40 border-slate-800 opacity-80'
                    : 'bg-slate-800/90 border-slate-700 shadow-sm ring-1 ring-amber-500/20'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {getAlertBadge(alert.type, alert.daysRemaining)}
                    <span className="text-xs text-slate-400 font-mono">
                      {new Date(alert.timestamp).toLocaleTimeString(getLanguage() === 'ar' ? 'ar-SA' : 'en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {!alert.isRead && (
                      <button
                        onClick={() => onMarkAsRead(alert.id)}
                        className="text-[11px] text-slate-400 hover:text-white px-1.5 py-0.5 rounded hover:bg-slate-700/60 transition-colors cursor-pointer"
                      >
                        {translate("تحديد كمقروء")}
                      </button>
                    )}

                    {/* Delete notification button */}
                    <button
                      onClick={() => onDeleteNotification(alert.id)}
                      className="p-1 text-slate-400 hover:text-rose-400 hover:bg-rose-950/50 rounded-md transition-colors cursor-pointer"
                      title={translate("حذف هذا التنبيه من القائمة")}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Preformatted Message box matching user exact requirement */}
                <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800/80 font-sans text-xs space-y-1 text-slate-200 shadow-xs">
                  <div className="font-bold text-amber-400 flex items-center justify-between">
                    <span>{translate('تنبيه شيك')} {translate(alert.daysRemaining <= 0 ? 'مستحق' : 'قادم')}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">{translate("المحل:")} </span>
                    <span className="font-semibold text-white">{alert.storeName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">{translate("المبلغ:")} </span>
                    <span className="font-bold text-emerald-400 font-mono">
                      {formatCurrency(alert.amount)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">{translate("تاريخ الاستحقاق:")} </span>
                    <span className="text-slate-200 font-medium">
                      {formatLocalizedDate(alert.dueDate)}
                    </span>
                  </div>
                  <div className="font-bold text-amber-300 pt-1">
                    {alert.daysRemaining > 0
                      ? translate(`متبقي ${alert.daysRemaining} أيام`)
                      : alert.daysRemaining === 0
                      ? translate('يوم الاستحقاق هو اليوم!')
                      : translate(`متأخر منذ ${Math.abs(alert.daysRemaining)} يوم`)}
                  </div>
                </div>

                {/* Action button */}
                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-slate-400">
                    {alert.daysRemaining <= 0 ? translate('شيك عاجل') : translate(`متبقي ${alert.daysRemaining} أيام`)}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        onCashCheck(alert.checkId);
                        onMarkAsRead(alert.id);
                      }}
                      className="px-3 py-1.5 bg-emerald-600/30 hover:bg-emerald-600 border border-emerald-500/40 text-emerald-300 hover:text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{translate("تم صرف الشيك الآن")}</span>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
