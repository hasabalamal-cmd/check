import React, { useState, useEffect } from 'react';
import {
  X,
  Settings,
  Database,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  Folder,
  Send,
  CloudUpload,
} from 'lucide-react';
import { getGasApiUrl, setGasApiUrl, testGasConnection, syncSeedDataToGas } from '../services/gasApi';
import { Customer, CheckItem, CustomerInvoice, ReceivedInvoice } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnectionSuccess: () => void;
  data: {
    customers: Customer[];
    invoices: CustomerInvoice[];
    checks: CheckItem[];
    receivedInvoices: ReceivedInvoice[];
  };
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onConnectionSuccess,
  data,
}) => {
  const [url, setUrl] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setUrl(getGasApiUrl());
      setTestResult(null);
      setSyncResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      setGasApiUrl('');
      setTestResult({ success: false, message: 'تم إفراغ الرابط. سيعمل التطبيق بالوضع المحلي (Cache).' });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    const result = await testGasConnection(url.trim());
    setTestResult(result);
    setIsTesting(false);

    if (result.success) {
      setGasApiUrl(url.trim());
      onConnectionSuccess();
    }
  };

  const handleSyncSeedData = async () => {
    if (!url.trim()) {
      setSyncResult('يرجى حفظ واختبار رابط Google Apps Script أولاً.');
      return;
    }
    setIsSyncing(true);
    setSyncResult(null);
    try {
      await syncSeedDataToGas({
        customers: data.customers,
        invoices: data.invoices,
        cheques: data.checks,
        receivedInvoices: data.receivedInvoices,
      });
      setSyncResult('تم تصدير وتهيئة جميع الجداول بالبيانات بنجاح في Google Sheets!');
      onConnectionSuccess();
    } catch (err: any) {
      setSyncResult(err.message || 'فشل في رفع البيانات الأولية.');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in overflow-y-auto">
      <div className="relative max-w-xl w-full bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/95 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">إعدادات قاعدة البيانات والتخزين</h3>
              <p className="text-xs text-slate-400">
                Google Sheets لقاعدة البيانات و Google Drive لتخزين المستندات
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleTestAndSave} className="p-6 space-y-5">
          {/* Status Box */}
          <div className="p-4 bg-slate-800/80 rounded-2xl border border-slate-700/80 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">حالة الاتصال بالسحابة:</span>
              {getGasApiUrl() ? (
                <span className="flex items-center gap-1.5 text-emerald-400 font-semibold bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/30">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>رابط Apps Script معرّف</span>
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-amber-400 font-semibold bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/30">
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  <span>وضع العمل المحلي (Local Cache)</span>
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              يرتبط التطبيق مباشرة بـ Google Apps Script Web App كـ Backend API، ويتم حفظ الجداول في Google Sheets والصور في Google Drive بأمان دون وضع أي مفاتيح في الفرونت إند.
            </p>
          </div>

          {/* Web App URL Input */}
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-slate-200">
              رابط تطبيق الويب (Google Apps Script Web App URL)
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://script.google.com/macros/s/AKfycb.../exec"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-xs sm:text-sm font-mono focus:outline-none focus:border-emerald-500 transition-colors"
            />
            <p className="text-[11px] text-slate-400">
              الرابط الذي تحصل عليه بعد النشر (Deploy → New deployment → Web app) بصلاحية الوصول (Anyone).
            </p>
          </div>

          {/* Test connection result */}
          {testResult && (
            <div
              className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                testResult.success
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                  : 'bg-rose-500/15 border-rose-500/40 text-rose-300'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <span className="font-semibold">{testResult.message}</span>
              </div>
            </div>
          )}

          {/* Sync Seed Data option */}
          {url && testResult?.success && (
            <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700/60 space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white">تصدير البيانات النموذجية لـ Google Sheets</h4>
                  <p className="text-[11px] text-slate-400">
                    هل جدول البيانات جديد وفارغ؟ يمكنك بنقرة واحدة إرسال العملاء والشيكات الأولية إليه.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleSyncSeedData}
                  disabled={isSyncing}
                  className="px-3 py-1.5 bg-emerald-600/30 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/40 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap disabled:opacity-50"
                >
                  {isSyncing ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CloudUpload className="w-3.5 h-3.5" />
                  )}
                  <span>تصدير البيانات</span>
                </button>
              </div>
              {syncResult && (
                <div className="text-[11px] text-emerald-400 font-medium">{syncResult}</div>
              )}
            </div>
          )}

          {/* Setup Instructions Helper */}
          <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800 text-xs text-slate-300 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Folder className="w-4 h-4 text-emerald-400" />
                <span>ملف الكود المضمن: google-apps-script/Code.gs</span>
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              الملف متوفر داخل مشروعك في المسار <code className="text-emerald-400">google-apps-script/Code.gs</code> ومعه دليل شامل في <code className="text-emerald-400">README.md</code>.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs sm:text-sm font-medium transition-colors"
            >
              إغلاق
            </button>
            <button
              type="submit"
              disabled={isTesting}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all active:scale-95 disabled:opacity-50"
            >
              {isTesting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جاري اختبار الاتصال...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>حفظ واختبار الاتصال</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
