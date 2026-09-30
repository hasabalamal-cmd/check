import React, { useState, useEffect } from 'react';
import { X, Upload, Calendar, Building, CreditCard, FileText, Image as ImageIcon, CheckCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { CheckItem, Customer, CustomerInvoice } from '../types';
import { computeCheckStatus, getTodayString } from '../utils/checkCalculations';
import { isGasConfigured, uploadFileToDriveApi } from '../services/gasApi';
import { resolveImageUrl } from '../utils/imageUrl';

interface CheckFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (checkData: Partial<CheckItem>) => void;
  initialData?: CheckItem | null;
  customers: Customer[];
  customerInvoices: CustomerInvoice[];
}

export const CheckFormModal: React.FC<CheckFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  customers,
  customerInvoices,
}) => {
  const [checkNumber, setCheckNumber] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [dueDate, setDueDate] = useState(getTodayString());
  const [linkedInvoiceId, setLinkedInvoiceId] = useState('');
  const [bankName, setBankName] = useState('مصرف الراجحي');
  const [notes, setNotes] = useState('');
  const [image, setImage] = useState<string>('');
  const [manualStatus, setManualStatus] = useState<'none' | 'cashed' | 'cancelled'>('none');
  const [cashedDate, setCashedDate] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isDriveUploaded, setIsDriveUploaded] = useState(false);

  useEffect(() => {
    if (initialData) {
      setCheckNumber(initialData.checkNumber);
      setCustomerId(initialData.customerId);
      setAmount(initialData.amount);
      setDueDate(initialData.dueDate);
      setLinkedInvoiceId(initialData.linkedInvoiceId || '');
      setBankName(initialData.bankName || 'مصرف الراجحي');
      setNotes(initialData.notes || '');
      setImage(initialData.image || '');
      setManualStatus(
        initialData.manualStatus === 'cashed' || initialData.status === 'cashed' || initialData.status === 'مدفوع'
          ? 'cashed'
          : initialData.manualStatus === 'cancelled' || initialData.status === 'cancelled' || initialData.status === 'ملغي'
          ? 'cancelled'
          : 'none'
      );
      setCashedDate(initialData.cashedDate || (initialData.status === 'cashed' ? getTodayString() : ''));
      setIsDriveUploaded(Boolean(initialData.image && initialData.image.includes('drive.google.com')));
    } else {
      setCheckNumber(`CHK-${Math.floor(10000 + Math.random() * 90000)}`);
      setCustomerId(customers[0]?.id || '');
      setAmount('');
      setDueDate(getTodayString());
      setLinkedInvoiceId('');
      setBankName('مصرف الراجحي');
      setNotes('');
      setImage('');
      setManualStatus('none');
      setCashedDate('');
      setIsDriveUploaded(false);
    }
  }, [initialData, isOpen, customers]);

  if (!isOpen) return null;

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Data = reader.result as string;
      setImage(base64Data);

      if (isGasConfigured()) {
        try {
          setIsUploading(true);
          const uploadRes = await uploadFileToDriveApi(
            base64Data,
            `cheque_${Date.now()}_${file.name}`,
            file.type || 'image/jpeg'
          );
          if (uploadRes?.fileUrl) {
            setImage(uploadRes.fileUrl);
            setIsDriveUploaded(true);
          }
        } catch (err) {
          console.warn('Google Drive direct upload skipped or failed, using local file representation', err);
        } finally {
          setIsUploading(false);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleUseSampleCheckImage = () => {
    // Generate a sleek SVG check mockup data URL
    const svgCheck = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="300" viewBox="0 0 600 300">
      <rect width="600" height="300" fill="#f8fafc" rx="16" stroke="#0ea5e9" stroke-width="4"/>
      <rect x="20" y="20" width="560" height="260" fill="#ffffff" rx="8" stroke="#cbd5e1" stroke-dasharray="6 6"/>
      <text x="560" y="60" font-family="sans-serif" font-size="20" font-weight="bold" fill="#0f172a" text-anchor="end">${bankName || 'البنك المعتمد'}</text>
      <text x="40" y="60" font-family="sans-serif" font-size="16" fill="#64748b">NO: ${checkNumber || 'CHK-SAMPLE'}</text>
      <line x1="40" y1="80" x2="560" y2="80" stroke="#e2e8f0" stroke-width="2"/>
      <text x="560" y="120" font-family="sans-serif" font-size="15" fill="#475569" text-anchor="end">ادفعوا لأمر:</text>
      <line x1="40" y1="130" x2="470" y2="130" stroke="#0f172a" stroke-width="1.5"/>
      <text x="560" y="170" font-family="sans-serif" font-size="15" fill="#475569" text-anchor="end">مبلغ وقدره:</text>
      <rect x="40" y="145" width="180" height="40" fill="#f1f5f9" rx="6" stroke="#94a3b8"/>
      <text x="130" y="172" font-family="sans-serif" font-size="18" font-weight="bold" fill="#0284c7" text-anchor="middle">${amount ? amount + ' ر.س' : '0.00'}</text>
      <text x="560" y="220" font-family="sans-serif" font-size="14" fill="#64748b" text-anchor="end">تاريخ الاستحقاق: ${dueDate}</text>
      <text x="80" y="250" font-family="sans-serif" font-size="14" fill="#0f172a">التوقيع المعتمد: ✍️</text>
    </svg>`;
    const dataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(svgCheck)}`;
    setImage(dataUrl);
    setIsDriveUploaded(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId || !amount || Number(amount) <= 0 || !dueDate) {
      return;
    }

    const customer = customers.find((c) => c.id === customerId);
    const invoice = customerInvoices.find((i) => i.id === linkedInvoiceId);

    const mStatus = manualStatus === 'none' ? undefined : manualStatus;
    const computedStatus = computeCheckStatus(
      { dueDate, manualStatus: mStatus },
      getTodayString()
    );

    onSave({
      checkNumber,
      customerId,
      customerName: customer ? customer.name : '',
      amount: Number(amount),
      dueDate,
      linkedInvoiceId: linkedInvoiceId || undefined,
      linkedInvoiceNumber: invoice ? invoice.invoiceNumber : undefined,
      bankName,
      notes,
      image: image || undefined,
      status: computedStatus,
      manualStatus: mStatus,
      cashedDate: mStatus === 'cashed' ? (cashedDate || getTodayString()) : undefined,
    });

    onClose();
  };

  // Filter invoices for selected customer
  const customerRelatedInvoices = customerInvoices.filter(
    (inv) => inv.customerId === customerId
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in overflow-y-auto">
      <div className="relative max-w-xl w-full bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">
                {initialData ? 'تعديل بيانات الشيك' : 'تسجيل شيك صادر من عميل جديد'}
              </h3>
              <p className="text-xs text-slate-400">إدارة ومتابعة شيكات العملاء وتواريخ الصرف</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Customer Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              اسم المحل / العميل <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Building className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
              <select
                required
                value={customerId}
                onChange={(e) => {
                  setCustomerId(e.target.value);
                  setLinkedInvoiceId(''); // reset linked invoice
                }}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pr-10 pl-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
              >
                <option value="">-- اختر المحل أو العميل --</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.contactPerson})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Check Number */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                رقم الشيك <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={checkNumber}
                onChange={(e) => setCheckNumber(e.target.value)}
                placeholder="مثال: CHK-12345"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Check Amount */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                مبلغ الشيك (ر.س) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                required
                min="1"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="مثال: 15000"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm font-mono focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Due Date */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                تاريخ استحقاق/خروج الشيك <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                <input
                  type="date"
                  required
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl pr-10 pl-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Bank Name */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                اسم البنك المسحوب عليه
              </label>
              <input
                type="text"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="مثال: مصرف الراجحي"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Linked Invoice */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              الفاتورة المرتبطة بالشيك (اختياري)
            </label>
            <div className="relative">
              <FileText className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
              <select
                value={linkedInvoiceId}
                onChange={(e) => setLinkedInvoiceId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pr-10 pl-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="">-- بدون ربط بفاتورة محددة --</option>
                {customerRelatedInvoices.map((inv) => (
                  <option key={inv.id} value={inv.id}>
                    {inv.invoiceNumber} - بمبلغ {inv.amount.toLocaleString('ar-SA')} ر.س ({inv.invoiceDate})
                  </option>
                ))}
              </select>
            </div>
            {customerId && customerRelatedInvoices.length === 0 && (
              <p className="text-xs text-amber-400/80 mt-1">
                لا توجد فواتير مسجلة لهذا المحل حاليًا، يمكنك تسجيل الشيك بدون ربط أو إضافة فاتورة أولًا.
              </p>
            )}
          </div>

          {/* Status Override */}
          <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/50 space-y-2.5">
            <label className="block text-xs font-semibold text-slate-300">
              حالة الشيك:
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setManualStatus('none')}
                className={`py-2 px-3 rounded-lg text-xs font-medium border transition-colors ${
                  manualStatus === 'none'
                    ? 'bg-blue-600/30 border-blue-500 text-blue-300'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                تلقائي حسب التاريخ
              </button>
              <button
                type="button"
                onClick={() => {
                  setManualStatus('cashed');
                  if (!cashedDate) setCashedDate(getTodayString());
                }}
                className={`py-2 px-3 rounded-lg text-xs font-medium border flex items-center justify-center gap-1 transition-colors ${
                  manualStatus === 'cashed'
                    ? 'bg-emerald-600/30 border-emerald-500 text-emerald-300'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-emerald-400'
                }`}
              >
                <CheckCircle className="w-3.5 h-3.5" />
                تم صرفه
              </button>
              <button
                type="button"
                onClick={() => setManualStatus('cancelled')}
                className={`py-2 px-3 rounded-lg text-xs font-medium border transition-colors ${
                  manualStatus === 'cancelled'
                    ? 'bg-rose-600/30 border-rose-500 text-rose-300'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-rose-400'
                }`}
              >
                ملغي
              </button>
            </div>

            {manualStatus === 'cashed' && (
              <div className="pt-2 border-t border-slate-700/50">
                <label className="block text-xs text-slate-400 mb-1">تاريخ الصرف الفعلي:</label>
                <input
                  type="date"
                  value={cashedDate}
                  onChange={(e) => setCashedDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white text-xs font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>
            )}

            <p className="text-[11px] text-slate-400">
              إذا تم اختيار "تلقائي حسب التاريخ"، يحسب النظام حالته آلياً (قادم، مستحق اليوم، أو متأخر).
            </p>
          </div>

          {/* Check Image Attachment */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-slate-300">
                صورة الشيك (Google Drive)
              </label>
              {isUploading && (
                <span className="text-xs text-blue-400 flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>جاري الرفع إلى Google Drive...</span>
                </span>
              )}
              {isDriveUploaded && !isUploading && (
                <span className="text-xs text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>تم الرفع إلى Google Drive</span>
                </span>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-3 items-center">
              <label className="flex-1 w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-800 hover:bg-slate-700/80 border border-dashed border-slate-600 rounded-xl cursor-pointer text-slate-300 hover:text-white transition-colors text-sm">
                <Upload className="w-4 h-4 text-blue-400" />
                <span>رفع صورة من الجهاز</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>
              <button
                type="button"
                onClick={handleUseSampleCheckImage}
                className="w-full sm:w-auto px-4 py-3 bg-slate-800 hover:bg-slate-700 text-xs text-blue-400 hover:text-blue-300 border border-slate-700 rounded-xl transition-colors whitespace-nowrap flex items-center justify-center gap-1.5"
              >
                <ImageIcon className="w-3.5 h-3.5" />
                توليد نموذج شيك تلقائي
              </button>
            </div>
            {image && (
              <div className="mt-2 relative rounded-lg overflow-hidden border border-slate-700 w-36 h-20 bg-slate-950">
                <img
                  src={resolveImageUrl(image, 400).displayUrl}
                  alt="صورة الشيك"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Fallback to raw original URL
                    if (e.currentTarget.src !== image) {
                      e.currentTarget.src = image;
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    setImage('');
                    setIsDriveUploaded(false);
                  }}
                  className="absolute top-1 left-1 p-1 bg-rose-600 text-white rounded-full text-xs hover:bg-rose-700"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              ملاحظات
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="أي ملاحظات حول استلام الشيك أو شروط الدفع..."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-blue-500/20 transition-all"
            >
              {initialData ? 'حفظ التعديلات' : 'تسجيل الشيك'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
