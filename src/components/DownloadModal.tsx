import React, { useState } from 'react';
import { Download, X, Copy, Check, Terminal, ExternalLink, FileArchive } from 'lucide-react';
import { useToast } from './Toast';

interface DownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DownloadModal: React.FC<DownloadModalProps> = ({ isOpen, onClose }) => {
  const [downloading, setDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);
  const { notify } = useToast();

  if (!isOpen) return null;

  const ZIP_FILE_NAME = 'AI_Creator_Studio_Complete_Source.zip';
  const zipRelativeUrl = '/api/source-zip';
  const fullZipUrl = typeof window !== 'undefined' ? `${window.location.origin}${zipRelativeUrl}` : zipRelativeUrl;
  const curlCommand = `curl -L -o ${ZIP_FILE_NAME} "${fullZipUrl}"`;

  const formatBytes = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    return mb >= 1 ? `${mb.toFixed(2)} MB` : `${bytes} B`;
  };

  // Robust client-side Blob downloader
  const handleDirectDownload = async () => {
    try {
      setDownloading(true);
      setDownloadSuccess(false);

      const response = await fetch(zipRelativeUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const contentLength = Number(response.headers.get('Content-Length') || 0);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = ZIP_FILE_NAME;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => {
        window.URL.revokeObjectURL(blobUrl);
      }, 1000);

      setDownloading(false);
      setDownloadSuccess(true);
      notify(
        `Source archive downloaded (${contentLength ? formatBytes(contentLength) : 'size unknown'}).`,
        'success'
      );
      setTimeout(() => setDownloadSuccess(false), 4000);
    } catch (err) {
      console.error('Blob download failed:', err);
      notify('Source archive is temporarily unavailable.', 'error');
      setDownloading(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(zipRelativeUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleOpenLink = () => {
    window.open(zipRelativeUrl, '_blank');
  };

  const handleCopyCurl = () => {
    navigator.clipboard.writeText(curlCommand);
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-[#0F172A] border border-[#202B40] rounded-3xl p-6 text-left space-y-5 shadow-2xl relative">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#202B40] pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#15DDF5]/15 border border-[#15DDF5]/40 flex items-center justify-center text-[#15DDF5] shadow-neon-cyan">
              <FileArchive className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Download Project Source Code ZIP</h3>
              <p className="text-xs text-[#93A4C0]">{ZIP_FILE_NAME}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg text-[#93A4C0] hover:text-white hover:bg-[#1E293B]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Primary Action Button (JavaScript Blob Stream) */}
        <div className="space-y-2">
          <button
            onClick={handleDirectDownload}
            disabled={downloading}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#15DDF5] via-[#508CFF] to-[#A13DFF] text-black font-extrabold text-sm shadow-neon-cyan hover:opacity-95 transition-opacity flex items-center justify-center gap-2 active:scale-98 disabled:opacity-60"
          >
            <Download className={`w-4 h-4 ${downloading ? 'animate-bounce' : ''}`} />
            <span>
              {downloading ? 'Building archive from server...' : 'Click Here to Download ZIP Now'}
            </span>
          </button>

          {downloadSuccess && (
            <p className="text-xs text-center text-[#19D89B] font-semibold animate-in fade-in">
              ✓ Download initiated! Check your browser's download tray/folder.
            </p>
          )}
        </div>

        {/* Fallback Option 1: Direct URL Link */}
        <div className="p-3.5 bg-[#172235] border border-[#202B40] rounded-2xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <ExternalLink className="w-3.5 h-3.5 text-[#15DDF5]" />
              Direct Browser Link (Agar iframe me download block ho raha hai)
            </span>
            <button
              onClick={handleCopyLink}
              className="text-[11px] text-[#15DDF5] hover:underline flex items-center gap-1 font-semibold"
            >
              {copiedLink ? <Check className="w-3 h-3 text-[#19D89B]" /> : <Copy className="w-3 h-3" />}
              <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
            </button>
          </div>
          <p className="text-[11px] text-[#93A4C0]">
            Is link ko copy karke naye browser tab me paste karein ya click karein:
          </p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={zipRelativeUrl}
              className="flex-1 bg-[#121B2D] border border-[#202B40] rounded-xl px-2.5 py-1.5 text-xs text-[#15DDF5] font-mono select-all focus:outline-none"
            />
            <button
              onClick={handleOpenLink}
              className="px-3 py-1.5 bg-[#202B40] hover:bg-[#2e3e5c] text-xs font-semibold rounded-xl text-white whitespace-nowrap"
            >
              Open Link
            </button>
          </div>
        </div>

        {/* Fallback Option 2: cURL / Terminal Command */}
        <div className="p-3.5 bg-[#172235] border border-[#202B40] rounded-2xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-amber-400" />
              Terminal / Command Line Download (cURL)
            </span>
            <button
              onClick={handleCopyCurl}
              className="text-[11px] text-[#15DDF5] hover:underline flex items-center gap-1 font-semibold"
            >
              {copiedCurl ? <Check className="w-3 h-3 text-[#19D89B]" /> : <Copy className="w-3 h-3" />}
              <span>{copiedCurl ? 'Copied!' : 'Copy Command'}</span>
            </button>
          </div>
          <div className="bg-[#121B2D] p-2.5 rounded-xl border border-[#202B40] font-mono text-[11px] text-[#93A4C0] break-all select-all">
            {curlCommand}
          </div>
        </div>

        {/* Contents Info */}
        <div className="text-[10px] text-[#93A4C0] flex items-center justify-between pt-1 border-t border-[#202B40]">
          <span>Includes: Frontend, Backend API, Prisma Schema, Seeds, Docker & Docs</span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded-lg text-xs font-semibold bg-[#202B40] text-white hover:bg-[#2e3e5c]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
