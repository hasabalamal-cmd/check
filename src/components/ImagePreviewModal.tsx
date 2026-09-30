import React, { useState, useEffect } from 'react';
import { X, Download, ExternalLink, RefreshCw, ZoomIn, ZoomOut, AlertCircle, Image as ImageIcon } from 'lucide-react';
import { resolveImageUrl } from '../utils/imageUrl';

interface ImagePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  title: string;
}

export const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  title,
}) => {
  const [zoom, setZoom] = useState(1);
  const [imgSrc, setImgSrc] = useState<string>('');
  const [hasError, setHasError] = useState(false);
  const [usedFallback, setUsedFallback] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const urlInfo = resolveImageUrl(imageUrl, 2000);

  // Initialize or reset source when modal opens or url changes
  useEffect(() => {
    if (isOpen && imageUrl) {
      setImgSrc(urlInfo.displayUrl);
      setHasError(false);
      setUsedFallback(false);
      setIsLoading(true);
      setZoom(1);
    }
  }, [isOpen, imageUrl]);

  if (!isOpen || !imageUrl) return null;

  // Error fallback: If thumbnail endpoint fails, try original URL or direct view
  const handleImageError = () => {
    if (!usedFallback && urlInfo.isGoogleDrive && imgSrc !== urlInfo.originalUrl) {
      // Try fallback to original URL (e.g. uc?export=view)
      setUsedFallback(true);
      setImgSrc(urlInfo.originalUrl);
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="relative max-w-5xl w-full bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-slate-800 bg-slate-900/95">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl shrink-0">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-base sm:text-lg text-white truncate" title={title}>
                {title}
              </h3>
              {urlInfo.isGoogleDrive && (
                <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                  <span>ملف مخزن في Google Drive</span>
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Zoom Controls */}
            <div className="hidden sm:flex items-center bg-slate-800/80 rounded-xl p-0.5 border border-slate-700/60 ml-2">
              <button
                type="button"
                onClick={handleZoomIn}
                className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700/60 rounded-lg transition-colors"
                title="تكبير"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleResetZoom}
                className="px-2 py-1 text-xs font-mono text-slate-300 hover:text-white"
                title="إعادة ضبط الحجم"
              >
                {Math.round(zoom * 100)}%
              </button>
              <button
                type="button"
                onClick={handleZoomOut}
                className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700/60 rounded-lg transition-colors"
                title="تصغير"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
            </div>

            {/* Open Original in Google Drive / New Tab */}
            <a
              href={urlInfo.viewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-colors flex items-center gap-1.5 text-xs font-medium"
              title="فتح الملف في نافذة جديدة أو Google Drive"
            >
              <ExternalLink className="w-4 h-4" />
              <span className="hidden md:inline">فتح الرابط</span>
            </a>

            {/* Direct Download */}
            <a
              href={urlInfo.downloadUrl}
              download={urlInfo.isGoogleDrive ? undefined : 'document-image'}
              target={urlInfo.isGoogleDrive ? '_blank' : undefined}
              rel="noopener noreferrer"
              className="p-2 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-colors flex items-center gap-1.5 text-xs font-medium"
              title="تحميل الملف أو الصورة"
            >
              <Download className="w-4 h-4" />
              <span className="hidden md:inline">تحميل</span>
            </a>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-colors"
              title="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Display Area */}
        <div className="p-4 sm:p-6 flex-1 flex items-center justify-center overflow-auto bg-slate-950/80 min-h-[350px] relative select-none">
          {isLoading && !hasError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/60 backdrop-blur-xs z-10 space-y-2">
              <RefreshCw className="w-8 h-8 text-blue-400 animate-spin" />
              <p className="text-xs text-slate-400 font-medium">جاري تحميل صورة المستند...</p>
            </div>
          )}

          {hasError ? (
            <div className="text-center p-8 max-w-md space-y-4 bg-slate-900/90 border border-slate-800 rounded-2xl">
              <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-white">تعذر عرض المعاينة المباشرة</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  الملف محفوظ بنجاح في Google Drive، ولكن قد يحتاج إلى فتح الرابط المباشر لعرضه أو تنزيله.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                <a
                  href={urlInfo.viewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-lg shadow-blue-600/20"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>فتح في Google Drive</span>
                </a>
                <a
                  href={urlInfo.downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>تنزيل الملف</span>
                </a>
              </div>
            </div>
          ) : (
            <div
              className="transition-transform duration-150 ease-out max-w-full flex items-center justify-center"
              style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
            >
              <img
                src={imgSrc}
                alt={title}
                onError={handleImageError}
                onLoad={handleImageLoad}
                className="max-h-[72vh] max-w-full w-auto object-contain rounded-xl shadow-2xl border border-slate-800/80 transition-all"
                loading="eager"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
