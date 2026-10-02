import React from 'react';
import {
  Bot,
  Play,
  Bell,
  Clock,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Send,
  Sparkles,
  Check,
  Trash2,
} from 'lucide-react';
import { AlertNotification, CheckItem } from '../types';
import {
  formatArabicDate,
  formatCurrency,
  sortAlertsByClosest,
} from '../utils/checkCalculations';

interface AutomationBotViewProps {
  checks: CheckItem[];
  notifications: AlertNotification[];
  onRunBotScan: () => void;
  onCashCheck: (checkId: string) => void;
  onRequestBrowserPermission: () => void;
  hasBrowserPermission: boolean;
  onMarkAllAsRead: () => void;
  onDeleteNotification?: (id: string) => void;
  onClearAllNotifications?: () => void;
}

export const AutomationBotView: React.FC<AutomationBotViewProps> = ({
  checks,
  notifications,
  onRunBotScan,
  onCashCheck,
  onRequestBrowserPermission,
  hasBrowserPermission,
  onMarkAllAsRead,
  onDeleteNotification,
  onClearAllNotifications,
}) => {
  const sortedAlerts = sortAlertsByClosest(notifications);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-500/15 text-amber-400 rounded-2xl border border-amber-500/30">
            <Bot className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
              المساعد الآلي وجدولة تنبيهات الشيكات
            </h1>
            <p className="text-xs text-slate-400">
              جدولة وفحص آلي مستمر للشيكات وإشعارك بالأقرب استحقاقاً أولاً، مع إمكانية حذف وإدارة التنبيهات
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onRunBotScan}
            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-sm flex items-center gap-2 shadow-sm shadow-amber-500/20 transition-all active:scale-95 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>تشغيل فحص الشيكات الآن</span>
          </button>
        </div>
      </div>

      {/* Rules Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-slate-900/90 rounded-2xl border border-slate-800 shadow-xs">
          <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm mb-1">
            <Clock className="w-4 h-4" />
            <span>قبل 7 أيام</span>
          </div>
          <p className="text-xs text-slate-300">
            تنبيه مبكر لتحضير الشيك وتأكيد الرصيد مع العميل.
          </p>
        </div>

        <div className="p-4 bg-slate-900/90 rounded-2xl border border-slate-800 shadow-xs">
          <div className="flex items-center gap-2 text-blue-400 font-bold text-sm mb-1">
            <Clock className="w-4 h-4" />
            <span>قبل 3 أيام</span>
          </div>
          <p className="text-xs text-slate-300">
            تذكير لقرب موعد الاستحقاق والتنسيق مع البنك.
          </p>
        </div>

        <div className="p-4 bg-slate-900/90 rounded-2xl border border-slate-800 shadow-xs">
          <div className="flex items-center gap-2 text-orange-400 font-bold text-sm mb-1">
            <AlertTriangle className="w-4 h-4" />
            <span>قبل يوم واحد</span>
          </div>
          <p className="text-xs text-slate-300">
            تنبيه عاجل بأن الشيك سيستحق في اليوم التالي مباشرة.
          </p>
        </div>

        <div className="p-4 bg-slate-900/90 rounded-2xl border border-slate-800 shadow-xs">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-sm mb-1">
            <Clock className="w-4 h-4" />
            <span>يوم الاستحقاق ومتأخر</span>
          </div>
          <p className="text-xs text-slate-300">
            إشعار صرف فوري وإذا تجاوز اليوم دون صرف يصبح "متأخر".
          </p>
        </div>
      </div>

      {/* Browser Notification Status Box */}
      <div className="p-4 bg-slate-900/90 rounded-2xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/15 text-blue-400 rounded-xl border border-blue-500/30">
            <Send className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-semibold text-white">
              إشعارات المتصفح (Web Push Notifications)
            </div>
            <div className="text-xs text-slate-400">
              {hasBrowserPermission
                ? 'إشعارات المتصفح مفعلة بنجاح، ستصلك تنبيهات الشيكات على جهازك.'
                : 'قم بتفعيل إشعارات المتصفح لاستلام إشعارات الشيكات حتى لو كان التطبيق مغلقاً أو في الخلفية.'}
            </div>
          </div>
        </div>

        {!hasBrowserPermission && (
          <button
            onClick={onRequestBrowserPermission}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold self-start sm:self-auto cursor-pointer"
          >
            تفعيل الإشعارات
          </button>
        )}
      </div>

      {/* Notification Example Box requested by user */}
      <div className="p-5 bg-slate-900/90 rounded-2xl border border-amber-500/30 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>صيغة الإشعار المعتمدة للشيكات</span>
          </h3>
          <span className="text-xs text-slate-400 font-mono">Sample Push Format</span>
        </div>

        <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 font-mono text-xs text-slate-200 space-y-1.5 max-w-md">
          <div className="font-bold text-amber-400 text-sm">تنبيه شيك قادم</div>
          <div>المحل: مؤسسة الأمل التجارية</div>
          <div>المبلغ: 15,000 ريال</div>
          <div>تاريخ الاستحقاق: 15 أكتوبر</div>
          <div className="text-emerald-400 font-bold">متبقي 3 أيام</div>
        </div>
      </div>

      {/* Sent Alerts Log - Sorted with Closest First */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-white text-base">
              سجل التنبيهات المرسلة ({sortedAlerts.length})
            </h3>
            <span className="text-xs text-slate-400 bg-slate-800 px-2.5 py-0.5 rounded-full border border-slate-700">
              مرتب بالأقرب استحقاقاً أولاً
            </span>
          </div>

          <div className="flex items-center gap-2">
            {sortedAlerts.length > 0 && (
              <button
                onClick={onMarkAllAsRead}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>تحديد الكل كمقروء</span>
              </button>
            )}

            {sortedAlerts.length > 0 && onClearAllNotifications && (
              <button
                onClick={onClearAllNotifications}
                className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-rose-950/40 transition-colors cursor-pointer"
                title="حذف جميع التنبيهات"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>مسح الكل</span>
              </button>
            )}
          </div>
        </div>

        <div className="space-y-3">
          {sortedAlerts.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs">
              لم يتم رصد أي تنبيهات شيكات حالية. يمكنك النقر على "تشغيل فحص الشيكات الآن" لإجراء فحص مباشر.
            </div>
          ) : (
            sortedAlerts.map((alert) => (
              <div
                key={alert.id}
                className="p-4 bg-slate-950/70 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-amber-400">
                      تنبيه شيك {alert.daysRemaining <= 0 ? 'مستحق' : 'قادم'}
                    </span>
                    <span className="text-slate-600">•</span>
                    <span className="font-bold text-white">{alert.storeName}</span>
                    <span className="text-slate-600">•</span>
                    <span className="font-mono text-emerald-400 font-semibold">
                      {formatCurrency(alert.amount)}
                    </span>
                  </div>
                  <div className="text-slate-400 flex items-center gap-2 text-[11px]">
                    <span>استحقاق: {formatArabicDate(alert.dueDate)}</span>
                    <span>•</span>
                    <span className="text-amber-300 font-semibold">
                      {alert.daysRemaining > 0
                        ? `متبقي ${alert.daysRemaining} أيام`
                        : alert.daysRemaining === 0
                        ? 'مستحق اليوم'
                        : `متأخر منذ ${Math.abs(alert.daysRemaining)} يوم`}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <button
                    onClick={() => onCashCheck(alert.checkId)}
                    className="px-3 py-1.5 bg-emerald-600/30 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/40 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>تم صرف الشيك</span>
                  </button>

                  {onDeleteNotification && (
                    <button
                      onClick={() => onDeleteNotification(alert.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                      title="حذف هذا التنبيه"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
