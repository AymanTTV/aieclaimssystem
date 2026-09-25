// src/components/common/ShareSystemModal.tsx
import React, { useState } from 'react';
import { 
  X, 
  Share2, 
  Copy, 
  Check, 
  ExternalLink, 
  QrCode, 
  MessageCircle, 
  Mail, 
  Sparkles,
  Smartphone,
  Globe
} from 'lucide-react';
import toast from 'react-hot-toast';

interface ShareSystemModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultPath?: string;
}

export const ShareSystemModal: React.FC<ShareSystemModalProps> = ({
  isOpen,
  onClose,
  defaultPath,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [selectedShareType, setSelectedShareType] = useState<'current' | 'main'>(
    defaultPath && defaultPath !== '/' ? 'current' : 'main'
  );

  if (!isOpen) return null;

  const origin = window.location.origin;
  const currentPath = window.location.pathname;
  const activeUrl = selectedShareType === 'current' ? `${origin}${currentPath}` : origin;
  const pageLabel = currentPath === '/' || currentPath === '/dashboard' 
    ? 'Main Dashboard' 
    : currentPath.replace('/', '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(activeUrl);
      setCopiedLink(true);
      toast.success('Link copied to clipboard with rich preview image!');
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      toast.error('Failed to copy link');
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'AIE SKYLINE FLEET SYSTEM',
          text: `Access AIE Skyline Fleet System (${selectedShareType === 'current' ? pageLabel : 'Main System'}):`,
          url: activeUrl,
        });
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          handleCopyLink();
        }
      }
    } else {
      handleCopyLink();
    }
  };

  const shareViaWhatsApp = () => {
    const text = encodeURIComponent(
      `🚗 *AIE SKYLINE FLEET SYSTEM*\nAccess the fleet portal (${selectedShareType === 'current' ? pageLabel : 'Main System'}):\n${activeUrl}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const shareViaEmail = () => {
    const subject = encodeURIComponent(`AIE Skyline Fleet System – ${selectedShareType === 'current' ? pageLabel : 'Portal Access'}`);
    const body = encodeURIComponent(
      `Hello,\n\nPlease access the AIE Skyline Fleet System via the link below:\n\n${activeUrl}\n\nKind regards,\nAIE Skyline Operations Team`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header with Brand Gradient */}
        <div className="p-4 bg-gradient-to-r from-[#212049] via-[#423fbd] to-[#212049] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/10 rounded-xl backdrop-blur-xs border border-white/20">
              <Share2 className="w-5 h-5 text-[#40b6cb]" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Share AIE Skyline Fleet Link</h3>
              <p className="text-xs text-blue-200/80">Social preview card image included automatically</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-slate-800">
          {/* Social Share Preview Card Simulator */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 overflow-hidden shadow-2xs">
            <div className="relative aspect-video w-full overflow-hidden bg-slate-900">
              <img
                src="/og-image.jpg"
                alt="AIE Skyline Fleet System"
                className="w-full h-full object-cover"
                onError={(e) => {
                  // Fallback if image path differs
                  (e.target as HTMLImageElement).src = '/share-image.jpg';
                }}
              />
              <div className="absolute top-2 left-2 bg-[#212049]/90 text-white px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase border border-white/20 flex items-center gap-1 shadow-sm">
                <Sparkles className="w-3 h-3 text-[#40b6cb]" />
                <span>Rich Card Preview</span>
              </div>
            </div>
            <div className="p-3 bg-white border-t border-slate-100">
              <span className="text-[10px] font-mono text-[#423fbd] uppercase tracking-wider block font-bold">
                system.aieskyline.com
              </span>
              <h4 className="font-bold text-sm text-slate-900 mt-0.5 leading-snug">
                {selectedShareType === 'current' ? `${pageLabel} – AIE SKYLINE FLEET SYSTEM` : 'AIE SKYLINE FLEET SYSTEM'}
              </h4>
              <p className="text-xs text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">
                Complete fleet, rental, and maintenance management platform with automated workflows, real-time analytics, and customer communication.
              </p>
            </div>
          </div>

          {/* Share Type Selector: Page Link vs Main System Link */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setSelectedShareType('current')}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedShareType === 'current'
                  ? 'bg-white text-[#212049] shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5 text-[#423fbd]" />
              <span>Current Page Link</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedShareType('main')}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedShareType === 'main'
                  ? 'bg-white text-[#212049] shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Globe className="w-3.5 h-3.5 text-[#40b6cb]" />
              <span>Main System Link</span>
            </button>
          </div>

          {/* Link URL Copy Bar */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
              {selectedShareType === 'current' ? `Link to this page (${pageLabel})` : 'Main System Portal Link'}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={activeUrl}
                className="flex-1 px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl text-slate-800 select-all focus:outline-none"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className="px-3.5 py-2 bg-[#423fbd] hover:bg-[#34319c] text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                {copiedLink ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
              </button>
            </div>
          </div>

          {/* Quick Share Actions: WhatsApp, Email, Native */}
          <div className="pt-2 border-t border-slate-100 grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={shareViaWhatsApp}
              className="flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              <MessageCircle className="w-4 h-4 text-emerald-600" />
              <span>WhatsApp</span>
            </button>
            <button
              type="button"
              onClick={shareViaEmail}
              className="flex items-center justify-center gap-1.5 py-2 px-3 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              <Mail className="w-4 h-4 text-sky-600" />
              <span>Email</span>
            </button>
            <button
              type="button"
              onClick={handleNativeShare}
              className="flex items-center justify-center gap-1.5 py-2 px-3 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              <Share2 className="w-4 h-4 text-purple-600" />
              <span>Share...</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
