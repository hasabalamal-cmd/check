import React, { useState } from 'react';
import { translate } from '../utils/i18n';
import {
  Upload,
  X,
  FileText,
  Image as ImageIcon,
  Loader2,
  CheckCircle2,
  File,
  Eye,
  Trash2,
} from 'lucide-react';
import { Attachment } from '../types';
import { isGasConfigured, uploadFilesToDriveApi } from '../services/gasApi';
import { getActiveShopId } from '../services/auth';
import { isPdfUrl, resolveImageUrl } from '../utils/imageUrl';

interface MultipleFileUploaderProps {
  attachments: Attachment[];
  onChange: (attachments: Attachment[]) => void;
  label?: string;
  shopId?: string;
  onPreview?: (url: string, title: string) => void;
}

export const MultipleFileUploader: React.FC<MultipleFileUploaderProps> = ({
  attachments,
  onChange,
  label = 'المرفقات والمستندات (صور أو PDF)',
  shopId = getActiveShopId(),
  onPreview,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    setIsUploading(true);
    setUploadError(null);
    setUploadProgress(translate('جاري تجهيز الملفات...'));

    try {
      const preparedFiles = await Promise.all(fileList.map(async (file) => {
        const base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        return { file, base64Data };
      }));

      let uploadedAttachments: Attachment[];
      if (isGasConfigured()) {
        setUploadProgress(`${translate('جاري رفع الملفات إلى Google Drive...')} (${fileList.length})`);
        const uploaded = await uploadFilesToDriveApi(
          preparedFiles.map(({ file, base64Data }) => ({
            base64Data,
            filename: `${Date.now()}_${file.name}`,
            mimeType: file.type || 'image/jpeg',
          })),
          shopId
        );
        uploadedAttachments = uploaded.map((uploadedFile, index) => ({
          id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          name: preparedFiles[index].file.name,
          url: uploadedFile.fileUrl,
          fileId: uploadedFile.fileId,
          mimeType: uploadedFile.mimeType || preparedFiles[index].file.type,
          size: preparedFiles[index].file.size,
        }));
      } else {
        uploadedAttachments = preparedFiles.map(({ file, base64Data }) => ({
          id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          name: file.name,
          url: base64Data,
          mimeType: file.type,
          size: file.size,
        }));
      }

      onChange([...attachments, ...uploadedAttachments]);
    } catch (err) {
      setUploadError(err instanceof Error ? translate(err.message) : translate('تعذر رفع الملفات.'));
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
      e.target.value = '';
    }
  };

  const handleRemove = (index: number) => {
    const updated = attachments.filter((_, i) => i !== index);
    onChange(updated);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
          {translate(label)}
        </label>
        {isUploading && (
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 animate-pulse">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>{uploadProgress || translate('جاري الرفع...')}</span>
          </span>
        )}
      </div>
      {uploadError && (
        <p role="alert" className="text-xs text-rose-500">{uploadError}</p>
      )}

      {/* Upload Drop Button */}
      <label className="flex items-center justify-center gap-2.5 px-4 py-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500/50 rounded-2xl cursor-pointer text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all text-xs font-medium group">
        <Upload className="w-4 h-4 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform" />
        <span>{translate("اختر صورة واحدة أو عدة صور / ملفات PDF")}</span>
        <input
          type="file"
          multiple
          accept="image/*,application/pdf"
          onChange={handleFilesSelected}
          disabled={isUploading}
          className="hidden"
        />
      </label>

      {/* Attached Files List */}
      {attachments.length > 0 && (
        <div className="space-y-1.5 pt-1 max-h-48 overflow-y-auto pr-1">
          <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 flex items-center justify-between">
            <span>الملفات المرفقة ({attachments.length}):</span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500">{translate("انقر للمعاينة أو الحذف")}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {attachments.map((att, idx) => {
              const isPdf = isPdfUrl(att.url, att.name);
              const urlInfo = resolveImageUrl(att.url, 400, att.name);

              return (
                <div
                  key={att.id || idx}
                  className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 rounded-xl gap-2 text-xs group"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {/* Thumbnail / Icon */}
                    {isPdf ? (
                      <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 overflow-hidden shrink-0">
                        <img
                          src={urlInfo.displayUrl}
                          alt={att.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            if (e.currentTarget.src !== att.url) {
                              e.currentTarget.src = att.url;
                            }
                          }}
                        />
                      </div>
                    )}

                    <div className="min-w-0">
                      <p className="text-slate-900 dark:text-white font-medium truncate max-w-[130px]" title={att.name}>
                        {att.name || `ملف ${idx + 1}`}
                      </p>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">
                        {isPdf ? 'مستند PDF' : 'صورة'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {onPreview && (
                      <button
                        type="button"
                        onClick={() => onPreview(att.url, att.name)}
                        className="p-1.5 text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                        title={translate("معاينة")}
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemove(idx)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                      title={translate("حذف الملف")}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
