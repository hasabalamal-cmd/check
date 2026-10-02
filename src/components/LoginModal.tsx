import React, { useState } from 'react';
import { translate } from '../utils/i18n';
import {
  Lock,
  User as UserIcon,
  Store,
  LogIn,
  AlertCircle,
  Eye,
  EyeOff,
} from 'lucide-react';
import { UserSession } from '../types';
import { login } from '../services/gasApi';
import { type Language } from '../utils/i18n';

interface LoginModalProps {
  isOpen: boolean;
  onLoginSuccess: (session: UserSession) => void;
  language: Language;
  onToggleLanguage: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onLoginSuccess,
  language,
  onToggleLanguage,
}) => {
  const hasLocalTestLogin = Boolean(
    import.meta.env.DEV &&
    import.meta.env.VITE_LOCAL_TEST_USERNAME &&
    import.meta.env.VITE_LOCAL_TEST_PASSWORD
  );
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await login(username, password);
      if (res.success && res.session) {
        onLoginSuccess(res.session);
      } else {
        setError(res.error || 'اسم المستخدم أو كلمة المرور غير صحيحة');
      }
    } catch (err: any) {
      setError(err?.message || 'حدث خطأ أثناء محاولة تسجيل الدخول.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-slate-950/85 backdrop-blur-md p-4 animate-in fade-in">
      <div className="relative max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden p-6 sm:p-8">
        {/* Glow decoration */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/10 dark:bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-500/10 dark:bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Brand Logo & Title */}
        <div className="relative text-center space-y-2 mb-6">
          <button
            type="button"
            onClick={onToggleLanguage}
            className="absolute top-0 right-0 h-9 px-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200"
            aria-label={language === 'ar' ? 'Switch to English' : translate('التبديل إلى العربية')}
          >
            {language === 'ar' ? 'EN' : 'ع'}
          </button>
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-400 mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/20 text-white font-black text-2xl font-mono">
            A
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-wide">{translate("تسجيل الدخول إلى Az Mang")}</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {translate("نظام إدارة الشيكات والفواتير للمحلات المتعددة")}
          </p>
          {hasLocalTestLogin && (
            <p className="text-xs text-emerald-700 dark:text-emerald-400">
              {translate("حساب التجربة المحلي مفعّل على بيئة التطوير فقط ولا يتصل بقاعدة البيانات.")}
            </p>
          )}
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-5 p-3.5 bg-rose-50 dark:bg-rose-500/15 border border-rose-200 dark:border-rose-500/40 rounded-xl flex items-center gap-3 text-rose-700 dark:text-rose-300 text-xs animate-in slide-in-from-top-2">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-500 dark:text-rose-400" />
            <span className="font-semibold leading-relaxed">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              {translate("اسم المستخدم أو معرف المحل")}
            </label>
            <div className="relative">
              <UserIcon className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={translate("admin أو bunn أو abc أو xyz")}
                className="w-full bg-slate-50 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 rounded-xl pr-10 pl-3 py-2.5 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-emerald-500 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-colors"
                autoFocus
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              {translate("كلمة المرور")}
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={translate("كلمة المرور")}
                className="w-full bg-slate-50 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 rounded-xl pr-10 pl-10 py-2.5 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-emerald-500 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3 top-3 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-sm font-bold shadow-md shadow-emerald-600/25 flex items-center justify-center gap-2 transition-all disabled:opacity-60 cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
            <span>{translate(isLoading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول')}</span>
          </button>
        </form>

      </div>
    </div>
  );
};
