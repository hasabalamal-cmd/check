import React, { useState, useEffect } from 'react';
import { translate } from '../utils/i18n';
import {
  X,
  Download,
  ExternalLink,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  AlertCircle,
  Image as ImageIcon,
  ChevronRight,
  ChevronLeft,
  FileText,
} from 'lucide-react';
import { Attachment } from '../types';
import { resolveImageUrl, parseAttachments } from '../utils/imageUrl';

interface ImagePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string; // single URL or JSON array of attachments
  title: string;
}

export const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  title,
}) => {
  const [zoom, setZoom] = useState(1);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hasError, setHasError] = useState(false);
  const [usedFallback, setUsedFallback] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Parse into attachments gallery
  const attachments: Attachment[] = parseAttachments(imageUrl);
  const activeAttachment = attachments[currentIndex] || attachments[0] || { name: title, url: imageUrl };
  const urlInfo = resolveImageUrl(activeAttachment.url, 2000, activeAttachment.name);

  const [activeImgSrc, setActiveImgSrc] = useState<string>('');

  useEffect(() => {
    if (isOpen && imageUrl) {
      setCurrentIndex(0);
      setActiveImgSrc(urlInfo.displayUrl);
      setHasError(false);
      setUsedFallback(false);
      setIsLoading(true);
      setZoom(1);
    }
  }, [isOpen, imageUrl]);

  useEffect(() => {
    if (activeAttachment) {
      setActiveImgSrc(urlInfo.displayUrl);
      setHasError(false);
      setUsedFallback(false);
      setIsLoading(true);
      setZoom(1);
    }
  }, [currentIndex]);

  if (!isOpen || !imageUrl) return null;

  const handleImageError = () => {
    if (!usedFallback && urlInfo.isGoogleDrive && activeImgSrc !== urlInfo.originalUrl) {
      setUsedFallback(true);
      setActiveImgSrc(urlInfo.originalUrl);
      setIsLoading(true);
    } else {
      setHasError(true);
      setIsLoading(false);
    }
  };

  const handleImageLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.5));
  const handleResetZoom = () => setZoom(1);

  const handleNext = () => {
    if (currentIndex < attachments.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-black/85 backdrop-blur-md p-2 sm:p-4 animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="relative max-w-5xl w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/95 dark:bg-slate-900/95 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl shrink-0">
              {urlInfo.isPdf ? <FileText className="w-5 h-5 text-rose-500 dark:text-rose-400" /> : <ImageIcon className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white truncate" title={title}>
                {title} {attachments.length > 1 && `(${currentIndex + 1} من ${attachments.length})`}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                {activeAttachment.name || (urlInfo.isPdf ? 'مستند PDF' : 'صورة')}
                {urlInfo.isGoogleDrive && <span className="text-emerald-600 dark:text-emerald-400 mr-2">• Google Drive</span>}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Zoom Controls */}
            {!urlInfo.isPdf && (
              <div className="hidden sm:flex items-center bg-slate-100 dark:bg-slate-800/80 rounded-xl p-0.5 border border-slate-200 dark:border-slate-700/60 ml-2">
                <button
                  type="button"
                  onClick={handleZoomIn}
                  className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-700/60 rounded-lg transition-colors cursor-pointer"
                  title={translate("تكبير")}
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleResetZoom}
                  className="px-2 py-1 text-xs font-mono text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                  title={translate("إعادة ضبط الحجم")}
                >
                  {Math.round(zoom * 100)}%
                </button>
                <button
                  type="button"
                  onClick={handleZoomOut}
                  className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-700/60 rounded-lg transition-colors cursor-pointer"
                  title={translate("تصغير")}
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Open Original in Google Drive / New Tab */}
            <a
              href={urlInfo.viewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl transition-colors flex items-center gap-1.5 text-xs font-medium cursor-pointer"
              title={translate("فتح الملف في نافذة جديدة")}
            >
              <ExternalLink className="w-4 h-4" />
              <span className="hidden md:inline">{translate("فتح الرابط")}</span>
            </a>

            {/* Direct Download */}
            <a
              href={urlInfo.downloadUrl}
              download={urlInfo.isGoogleDrive ? undefined : activeAttachment.name || 'document'}
              target={urlInfo.isGoogleDrive ? '_blank' : undefined}
              rel="noopener noreferrer"
              className="p-2 text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl transition-colors flex items-center gap-1.5 text-xs font-medium cursor-pointer"
              title={translate("تحميل الملف أو الصورة")}
            >
              <Download className="w-4 h-4" />
              <span className="hidden md:inline">{translate("تحميل")}</span>
            </a>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl transition-colors cursor-pointer"
              title={translate("إغلاق")}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Display Area */}
        <div className="p-4 sm:p-6 flex-1 flex items-center justify-center overflow-auto bg-slate-100 dark:bg-slate-950/80 min-h-[360px] relative select-none">
          {isLoading && !hasError && !urlInfo.isPdf && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/70 dark:bg-slate-950/60 backdrop-blur-xs z-10 space-y-2">
              <RefreshCw className="w-8 h-8 text-blue-500 dark:text-blue-400 animate-spin" />
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">{translate("جاري تحميل صورة المستند...")}</p>
            </div>
          )}

          {/* Previous / Next Arrows for Gallery */}
          {attachments.length > 1 && (
            <>
              <button
                type="button"
                onClick={handlePrev}
                disabled={currentIndex === 0}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-2.5 bg-white/90 hover:bg-white dark:bg-slate-800/80 dark:hover:bg-slate-700 text-slate-800 dark:text-white rounded-full shadow-lg border border-slate-200 dark:border-slate-700 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
                title={translate("الملف السابق")}
              >
                <ChevronRight className="w-6 h-6" />
              </button>
              <button
                type="button"
                onClick={handleNext}
                disabled={currentIndex === attachments.length - 1}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-2.5 bg-white/90 hover:bg-white dark:bg-slate-800/80 dark:hover:bg-slate-700 text-slate-800 dark:text-white rounded-full shadow-lg border border-slate-200 dark:border-slate-700 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
                title={translate("الملف التالي")}
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            </>
          )}

          {urlInfo.isPdf ? (
            <div className="w-full h-[65vh] flex flex-col items-center justify-center">
              <iframe
                src={urlInfo.displayUrl}
                className="w-full h-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white"
                title={activeAttachment.name}
              />
            </div>
          ) : hasError ? (
            <div className="text-center p-8 max-w-md space-y-4 bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
              <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">{translate("تعذر عرض المعاينة المباشرة")}</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {translate("الملف محفوظ بنجاح في Google Drive، ويمكنك فتحه مباشرة في نافذة جديدة.")}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                <a
                  href={urlInfo.viewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm shadow-blue-600/20"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>{translate("فتح في Google Drive")}</span>
                </a>
              </div>
            </div>
          ) : (
            <div
              className="transition-transform duration-150 ease-out max-w-full flex items-center justify-center"
              style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
            >
              <img
                src={activeImgSrc}
                alt={activeAttachment.name}
                onError={handleImageError}
                onLoad={handleImageLoad}
                className="max-h-[72vh] max-w-full w-auto object-contain rounded-xl shadow-xl border border-slate-200 dark:border-slate-800/80 transition-all bg-white dark:bg-transparent"
                loading="eager"
              />
            </div>
          )}
        </div>

        {/* Gallery Thumbnails Strip */}
        {attachments.length > 1 && (
          <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/95 dark:bg-slate-900/95 flex items-center justify-center gap-2 overflow-x-auto shrink-0">
            {attachments.map((att, idx) => {
              const itemInfo = resolveImageUrl(att.url, 200, att.name);
              const isSelected = idx === currentIndex;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCurrentIndex(idx)}
                  className={`w-14 h-14 rounded-xl overflow-hidden border-2 transition-all shrink-0 relative cursor-pointer ${
                    isSelected
                      ? 'border-emerald-500 shadow-sm shadow-emerald-500/25 scale-105'
                      : 'border-slate-300 dark:border-slate-700 opacity-60 hover:opacity-100'
                  }`}
                >
                  {itemInfo.isPdf ? (
                    <div className="w-full h-full bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                      <FileText className="w-5 h-5" />
                    </div>
                  ) : (
                    <img
                      src={itemInfo.displayUrl}
                      alt={att.name}
                      className="w-full h-full object-cover"
                    />
                  )}
                  <span className="absolute bottom-0 inset-x-0 bg-black/70 text-[9px] text-white text-center py-0.5">
                    {idx + 1}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
