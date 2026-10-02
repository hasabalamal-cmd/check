import React, { useState } from 'react';
import { translate } from '../utils/i18n';
import { X, FileSpreadsheet, Check, ExternalLink, Loader2, RefreshCw, AlertCircle, ShieldCheck } from 'lucide-react';
import { Customer, CheckItem, CustomerInvoice, ReceivedInvoice } from '../types';
import { exportDataToGoogleSheets, ExportToSheetsResult } from '../services/sheets';
import { googleSignIn, getAccessToken, logout } from '../services/auth';
import { User } from 'firebase/auth';

interface GoogleSheetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onAuthChange: (user: User | null) => void;
  data: {
    customers: Customer[];
    checks: CheckItem[];
    customerInvoices: CustomerInvoice[];
    receivedInvoices: ReceivedInvoice[];
  };
}

export const GoogleSheetsModal: React.FC<GoogleSheetsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onAuthChange,
  data,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ExportToSheetsResult | null>(null);
  const [confirmExport, setConfirmExport] = useState(false);

  if (!isOpen) return null;

  const handleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await googleSignIn();
      if (res?.user) {
        onAuthChange(res.user);
      }
    } catch (err: any) {
      console.error(err);
      setError(translate(err?.message || 'فشل تسجيل الدخول بحساب Google'));
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await logout();
      onAuthChange(null);
      setResult(null);
    } catch (err: any) {
      setError(translate(err?.message || 'حدث خطأ أثناء تسجيل الخروج'));
    }
  };

  const executeExport = async () => {
    setLoading(true);
    setError(null);
    try {
      let token = await getAccessToken();
      if (!token) {
        // Prompt sign in if token not cached
        const res = await googleSignIn();
        if (res) {
          token = res.accessToken;
          onAuthChange(res.user);
        } else {
          throw new Error(translate('يرجى تسجيل الدخول بحساب Google أولاً'));
        }
      }

      const res = await exportDataToGoogleSheets(token, data);
      setResult(res);
      setConfirmExport(false);
    } catch (err: any) {
      console.error(err);
      setError(translate(err?.message || 'تعذر تصدير البيانات إلى Google Sheets'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm p-4 animate-in fade-in overflow-y-auto">
      <div className="relative max-w-lg w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">{translate("تكامل Google Sheets")}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">{translate("مزامنة وتصدير السجلات إلى جداول بيانات Google")}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Account Status */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700/80">
            {currentUser ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {currentUser.photoURL ? (
                    <img
                      src={currentUser.photoURL}
                      alt="Google User"
                      className="w-10 h-10 rounded-full border border-emerald-500/40"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                      {currentUser.displayName?.[0] || 'U'}
                    </div>
                  )}
                  <div>
                    <div className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span>{currentUser.displayName || currentUser.email}</span>
                      <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{currentUser.email}</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="text-xs text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 underline cursor-pointer"
                >
                  {translate("تسجيل خروج")}
                </button>
              </div>
            ) : (
              <div className="text-center py-2 space-y-3">
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  {translate("قم بتسجيل الدخول بحساب Google الخاص بك لتصدير ومزامنة سجلات المحل مع Google Sheets بإذنك.")}
                </p>
                {/* Official Material Google Sign-in button */}
                <button
                  type="button"
                  onClick={handleSignIn}
                  disabled={loading}
                  className="inline-flex items-center justify-center gap-3 px-5 py-2.5 bg-white hover:bg-slate-50 text-slate-800 font-semibold rounded-xl text-sm transition-all shadow-md border border-slate-200 active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  <svg className="w-5 h-5" viewBox="0 0 48 48">
                    <path
                      fill="#EA4335"
                      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                    />
                    <path
                      fill="#4285F4"
                      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                    />
                    <path
                      fill="#34A853"
                      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                    />
                    <path fill="none" d="M0 0h48v48H0z" />
                  </svg>
                  <span>{translate("تسجيل الدخول باستخدام Google")}</span>
                </button>
              </div>
            )}
          </div>

          {/* Stats to be exported */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">{translate("البيانات التي سيتم تصديرها للجدول:")}</span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-400">{translate("محلات العملاء:")}</span>
                <span className="font-bold text-slate-900 dark:text-white font-mono">{data.customers.length}</span>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-400">{translate("شيكات العملاء:")}</span>
                <span className="font-bold text-slate-900 dark:text-white font-mono">{data.checks.length}</span>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-400">{translate("فواتير العملاء:")}</span>
                <span className="font-bold text-slate-900 dark:text-white font-mono">{data.customerInvoices.length}</span>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-400">{translate("الفواتير المستلمة:")}</span>
                <span className="font-bold text-slate-900 dark:text-white font-mono">{data.receivedInvoices.length}</span>
              </div>
            </div>
          </div>

          {/* Success banner */}
          {result && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 rounded-xl space-y-3">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-semibold text-sm">
                <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <span>{translate("تم إنشاء جدول Google Sheets وتصدير البيانات بنجاح!")}</span>
              </div>
              <a
                href={result.spreadsheetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-md transition-colors"
              >
                <span>{translate("فتح الجدول في Google Sheets")}</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-500/15 border border-rose-200 dark:border-rose-500/30 rounded-xl text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 dark:text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Confirmation step required before modifying/creating sheets */}
          {confirmExport ? (
            <div className="p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-xl space-y-3">
              <p className="text-xs text-amber-800 dark:text-amber-200 font-medium">
                تأكيد: هل أنت متأكد من إنشاء جدول جديد في حسابك على Google Sheets وتصدير {data.checks.length + data.receivedInvoices.length + data.customerInvoices.length} سجل مالي إليه؟
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={executeExport}
                  disabled={loading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>{translate("نعم، ابدأ التصدير الآن")}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmExport(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 dark:hover:text-white text-xs font-medium rounded-lg cursor-pointer"
                >
                  {translate("إلغاء")}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              disabled={loading}
              onClick={() => {
                if (!currentUser) {
                  handleSignIn();
                } else {
                  setConfirmExport(true);
                }
              }}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{translate("جاري المزامنة...")}</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  <span>{translate(currentUser ? 'تصدير البيانات إلى جدول جديد في Google Sheets' : 'تسجيل الدخول للمزامنة')}</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
