// src/components/workshop/TvAdMediaManager.tsx
import React, { useState, useRef } from 'react';
import {
  TVAdSettings,
  TVAdSlide,
  TVAdRotationSequence,
  DEFAULT_TV_AD_SETTINGS,
  uploadAdSlideMedia,
  deleteAdSlideMedia,
  saveTVAdSettings,
  isVideoMedia,
} from '../../utils/tvAdMediaService';
import {
  Upload,
  Plus,
  Trash2,
  Image as ImageIcon,
  CheckCircle2,
  Clock,
  Repeat,
  Sliders,
  Sparkles,
  Layers,
  AlertCircle,
  Eye,
  RotateCcw,
  Check,
  ExternalLink,
  ChevronRight,
  Maximize2,
  Film,
  Video,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import toast from 'react-hot-toast';

interface TvAdMediaManagerProps {
  settings: TVAdSettings;
  onUpdateSettings: (newSettings: TVAdSettings) => void;
}

export const TvAdMediaManager: React.FC<TvAdMediaManagerProps> = ({
  settings,
  onUpdateSettings,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [showAddUrlModal, setShowAddUrlModal] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newSubtitle, setNewSubtitle] = useState('');
  const [previewSlide, setPreviewSlide] = useState<TVAdSlide | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Handle Multiple File Uploads
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadProgress(`Uploading ${files.length} file(s)...`);

    const newSlides: TVAdSlide[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setUploadProgress(`Processing (${i + 1}/${files.length}): ${file.name}`);

      try {
        const { url, storagePath } = await uploadAdSlideMedia(file);
        const isVid = file.type.startsWith('video/') || isVideoMedia(file.name);

        newSlides.push({
          id: uuidv4(),
          title: '', // Left blank so raw file name is never overlaid on the slide
          subtitle: '',
          fileName: file.name,
          hasCustomTitle: false,
          mediaType: isVid ? 'video' : 'image',
          imageUrl: url,
          storagePath,
          fit: 'cover', // Default to full-bleed edge-to-edge cover
          createdAt: Date.now() + i,
          active: true,
        });
      } catch (err: any) {
        console.error('Failed to upload file:', file.name, err);
        toast.error(`Failed to upload ${file.name}`);
      }
    }

    if (newSlides.length > 0) {
      const updated: TVAdSettings = {
        ...settings,
        slides: [...settings.slides, ...newSlides],
      };
      onUpdateSettings(updated);
      await saveTVAdSettings(updated);
      toast.success(`Added ${newSlides.length} promo slide(s)!`);
    }

    setIsUploading(false);
    setUploadProgress('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 2. Add slide via direct URL
  const handleAddByUrl = async () => {
    if (!newUrl.trim()) {
      toast.error('Please enter an image or video URL');
      return;
    }

    const isVid = isVideoMedia(newUrl.trim());
    const newSlide: TVAdSlide = {
      id: uuidv4(),
      title: newTitle.trim(),
      subtitle: newSubtitle.trim(),
      hasCustomTitle: newTitle.trim().length > 0,
      mediaType: isVid ? 'video' : 'image',
      imageUrl: newUrl.trim(),
      fit: 'cover',
      createdAt: Date.now(),
      active: true,
    };

    const updated: TVAdSettings = {
      ...settings,
      slides: [...settings.slides, newSlide],
    };

    onUpdateSettings(updated);
    await saveTVAdSettings(updated);
    toast.success('Promo slide added!');

    setNewUrl('');
    setNewTitle('');
    setNewSubtitle('');
    setShowAddUrlModal(false);
  };

  // 3. Move slide up or down (Reorder)
  const handleMoveSlide = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= settings.slides.length) return;

    const newSlides = [...settings.slides];
    const [moved] = newSlides.splice(index, 1);
    newSlides.splice(targetIndex, 0, moved);

    const updated: TVAdSettings = {
      ...settings,
      slides: newSlides,
    };
    onUpdateSettings(updated);
    await saveTVAdSettings(updated);
  };

  // 4. Toggle slide active status
  const handleToggleSlide = async (id: string) => {
    const updatedSlides = settings.slides.map((s) =>
      s.id === id ? { ...s, active: s.active === false ? true : false } : s
    );
    const updated: TVAdSettings = {
      ...settings,
      slides: updatedSlides,
    };
    onUpdateSettings(updated);
    await saveTVAdSettings(updated);
  };

  // 4. Toggle fit ('contain' vs 'cover')
  const handleToggleFit = async (id: string) => {
    const updatedSlides = settings.slides.map((s) =>
      s.id === id ? { ...s, fit: (s.fit === 'cover' ? 'contain' : 'cover') as 'contain' | 'cover' } : s
    );
    const updated: TVAdSettings = {
      ...settings,
      slides: updatedSlides,
    };
    onUpdateSettings(updated);
    await saveTVAdSettings(updated);
  };

  // 5. Delete slide
  const handleDeleteSlide = async (slide: TVAdSlide) => {
    if (settings.slides.length <= 1) {
      toast.error('You must keep at least one slide in the library');
      return;
    }

    const updatedSlides = settings.slides.filter((s) => s.id !== slide.id);
    const updated: TVAdSettings = {
      ...settings,
      slides: updatedSlides,
    };
    onUpdateSettings(updated);
    await saveTVAdSettings(updated);

    if (slide.storagePath) {
      deleteAdSlideMedia(slide.storagePath).catch(() => {});
    }
    toast.success('Promo slide removed');
  };

  // 6. Reset to default presets
  const handleResetPresets = async () => {
    const updated: TVAdSettings = {
      ...DEFAULT_TV_AD_SETTINGS,
      enabled: settings.enabled,
      duration: settings.duration,
      rotationSequence: settings.rotationSequence,
    };
    onUpdateSettings(updated);
    await saveTVAdSettings(updated);
    toast.success('Restored default fleet promo slides');
  };

  // 7. Toggle promo slides master enable
  const handleToggleEnabled = async () => {
    const updated: TVAdSettings = {
      ...settings,
      enabled: !settings.enabled,
    };
    onUpdateSettings(updated);
    await saveTVAdSettings(updated);
    toast.success(
      updated.enabled ? 'Promo slides enabled on TV board' : 'Promo slides disabled'
    );
  };

  // 8. Update duration
  const handleDurationChange = async (durationSec: number) => {
    const safe = Math.max(5, Math.min(60, durationSec));
    const updated: TVAdSettings = {
      ...settings,
      duration: safe,
    };
    onUpdateSettings(updated);
    await saveTVAdSettings(updated);
  };

  // 9. Update rotation sequence
  const handleSequenceChange = async (seq: TVAdRotationSequence) => {
    const updated: TVAdSettings = {
      ...settings,
      rotationSequence: seq,
    };
    onUpdateSettings(updated);
    await saveTVAdSettings(updated);
  };

  return (
    <div className="space-y-5">
      {/* ─────────────────────────────────────────────────────────────
          1. MASTER TOGGLE & STATUS CARD
         ───────────────────────────────────────────────────────────── */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-900/90 border border-slate-700/80 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-xl border transition-colors ${
                settings.enabled
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Ad &amp; Promo Slides Rotation</span>
                <span
                  className={`text-[10px] uppercase font-black px-2 py-0.5 rounded-full border ${
                    settings.enabled
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  {settings.enabled ? 'Active Broadcast' : 'Disabled'}
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Automatically display company logos, promotional banners and service ads during TV auto-rotation.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleToggleEnabled}
            className={`relative inline-flex h-6 w-12 items-center rounded-full transition-colors cursor-pointer border ${
              settings.enabled ? 'bg-amber-500 border-amber-400' : 'bg-slate-800 border-slate-700'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-md ${
                settings.enabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. SLIDE CONFIGURATION CONTROLS (Duration & Sequence)
         ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* A. Display Duration Slider */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-200 uppercase tracking-wide flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>Promo Display Duration</span>
            </label>
            <span className="text-xs font-mono font-black text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 rounded-lg">
              {settings.duration} Seconds
            </span>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <input
              type="range"
              min={5}
              max={60}
              step={5}
              value={settings.duration}
              onChange={(e) => handleDurationChange(parseInt(e.target.value, 10))}
              className="flex-1 accent-amber-500 cursor-pointer"
            />
            <input
              type="number"
              min={5}
              max={60}
              value={settings.duration}
              onChange={(e) => handleDurationChange(parseInt(e.target.value, 10) || 15)}
              className="w-16 px-2 py-1 bg-slate-950 border border-slate-800 rounded-lg text-center font-mono font-bold text-white text-xs"
            />
          </div>

          {/* Quick presets */}
          <div className="flex gap-2 pt-1 flex-wrap">
            {[10, 15, 20, 30, 45].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => handleDurationChange(preset)}
                className={`px-2.5 py-1 text-xs font-mono font-bold rounded-lg border transition cursor-pointer ${
                  settings.duration === preset
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                }`}
              >
                {preset}s {preset === 15 ? '(Default)' : ''}
              </button>
            ))}
          </div>
        </div>

        {/* B. Rotation Sequence Selector */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
          <label className="text-xs font-bold text-slate-200 uppercase tracking-wide flex items-center gap-1.5">
            <Repeat className="w-3.5 h-3.5 text-blue-400" />
            <span>Rotation Sequence</span>
          </label>

          <div className="grid grid-cols-1 gap-2 pt-0.5">
            {/* Sequence 1: 1 Schedule -> 1 Promo */}
            <button
              type="button"
              onClick={() => handleSequenceChange('after_each_page')}
              className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex items-start gap-2.5 ${
                settings.rotationSequence === 'after_each_page'
                  ? 'bg-blue-600/20 text-white border-blue-500/60 shadow-sm'
                  : 'bg-slate-800/80 text-slate-300 border-slate-700/80 hover:bg-slate-800'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center shrink-0 ${
                  settings.rotationSequence === 'after_each_page'
                    ? 'border-blue-400 bg-blue-500'
                    : 'border-slate-600 bg-slate-900'
                }`}
              >
                {settings.rotationSequence === 'after_each_page' && (
                  <Check className="w-2.5 h-2.5 text-white" />
                )}
              </div>
              <div>
                <div className="text-xs font-bold">1 Schedule Page → 1 Promo Slide</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Interleaved: Alternates every schedule screen with an ad banner.
                </div>
              </div>
            </button>

            {/* Sequence 2: All Schedule -> Promo Loop */}
            <button
              type="button"
              onClick={() => handleSequenceChange('after_all_pages')}
              className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex items-start gap-2.5 ${
                settings.rotationSequence === 'after_all_pages'
                  ? 'bg-blue-600/20 text-white border-blue-500/60 shadow-sm'
                  : 'bg-slate-800/80 text-slate-300 border-slate-700/80 hover:bg-slate-800'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center shrink-0 ${
                  settings.rotationSequence === 'after_all_pages'
                    ? 'border-blue-400 bg-blue-500'
                    : 'border-slate-600 bg-slate-900'
                }`}
              >
                {settings.rotationSequence === 'after_all_pages' && (
                  <Check className="w-2.5 h-2.5 text-white" />
                )}
              </div>
              <div>
                <div className="text-xs font-bold">All Schedule Pages → Promo Loop</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Batch: Rotates through all schedule pages first, then displays promo slides.
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. MULTIPLE IMAGE & BANNER UPLOADER
         ───────────────────────────────────────────────────────────── */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wide flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span>Promo Slides Library ({settings.slides.length})</span>
            </h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Upload multiple images or banners (Company Logos, Promotional Banners, Fleet Services Ads).
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetPresets}
              className="px-2.5 py-1 text-xs text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition flex items-center gap-1 cursor-pointer"
              title="Reset to default company banners"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Default Banners</span>
            </button>
            <button
              type="button"
              onClick={() => setShowAddUrlModal(true)}
              className="px-2.5 py-1 text-xs text-blue-300 hover:text-white bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 rounded-lg transition flex items-center gap-1 cursor-pointer font-bold"
            >
              <Plus className="w-3 h-3" />
              <span>Add URL</span>
            </button>
          </div>
        </div>

        {/* Hidden Multi-file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/mp4,video/webm,video/ogg,video/quicktime"
          onChange={handleFileUpload}
          className="hidden"
        />

        {/* Drag & Drop Upload Zone */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className={`p-6 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-2.5 transition cursor-pointer ${
            isUploading
              ? 'border-amber-500/60 bg-amber-500/10'
              : 'border-slate-700 hover:border-amber-500/60 bg-slate-950/60 hover:bg-slate-950'
          }`}
        >
          <div className="p-3 rounded-full bg-slate-800 border border-slate-700 text-amber-400 shadow-md">
            <Upload className="w-5 h-5 animate-bounce" />
          </div>
          <div className="text-center">
            <p className="text-xs font-bold text-white">
              {isUploading ? uploadProgress : 'Click to Upload Multiple Images, Banners or Videos'}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Supports PNG, JPG, WEBP, SVG &amp; MP4/WEBM/MOV Videos • Select multiple files
            </p>
          </div>
        </div>

        {/* Slides Gallery / List */}
        <div className="space-y-2 pt-2">
          {settings.slides.map((slide, index) => {
            const isVid = isVideoMedia(slide.imageUrl) || slide.mediaType === 'video';
            return (
              <div
                key={slide.id}
                className={`p-3 rounded-xl border transition flex items-center justify-between gap-3 ${
                  slide.active !== false
                    ? 'bg-slate-950/80 border-slate-800'
                    : 'bg-slate-950/40 border-slate-800/60 opacity-60'
                }`}
              >
                {/* Thumbnail */}
                <div
                  onClick={() => setPreviewSlide(slide)}
                  className="w-16 h-12 rounded-lg overflow-hidden border border-slate-700 bg-slate-900 shrink-0 cursor-pointer relative group"
                >
                  {isVid ? (
                    <div className="w-full h-full relative bg-slate-950 flex items-center justify-center">
                      <video src={slide.imageUrl} className="w-full h-full object-cover" muted playsInline />
                      <div className="absolute top-1 left-1 p-0.5 rounded bg-black/80 text-amber-400">
                        <Film className="w-2.5 h-2.5" />
                      </div>
                    </div>
                  ) : (
                    <img
                      src={slide.imageUrl}
                      alt={slide.title || 'Slide'}
                      className={`w-full h-full ${
                        slide.fit === 'cover' ? 'object-cover' : 'object-contain p-1'
                      }`}
                    />
                  )}
                  <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Eye className="w-3.5 h-3.5 text-white" />
                  </div>
                </div>

                {/* Title & Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded">
                      #{index + 1}
                    </span>
                    {isVid && (
                      <span className="text-[9px] uppercase font-bold text-blue-400 bg-blue-500/10 border border-blue-500/30 px-1.5 py-0.2 rounded flex items-center gap-1">
                        <Video className="w-2.5 h-2.5" />
                        <span>Video</span>
                      </span>
                    )}
                    {slide.fileName && (
                      <span className="text-[10px] font-mono text-slate-500 truncate max-w-[150px]" title={slide.fileName}>
                        {slide.fileName}
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={slide.title || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      const updatedSlides = settings.slides.map((s) =>
                        s.id === slide.id ? { ...s, title: val, hasCustomTitle: val.trim().length > 0 } : s
                      );
                      const updated = { ...settings, slides: updatedSlides };
                      onUpdateSettings(updated);
                      saveTVAdSettings(updated);
                    }}
                    placeholder="Custom caption title (leave blank to hide overlay)..."
                    className="text-xs font-bold text-white bg-transparent border-b border-transparent hover:border-slate-700 focus:border-blue-500 focus:outline-none w-full truncate mt-1"
                  />
                  <input
                    type="text"
                    value={slide.subtitle || ''}
                    onChange={(e) => {
                      const updatedSlides = settings.slides.map((s) =>
                        s.id === slide.id ? { ...s, subtitle: e.target.value } : s
                      );
                      const updated = { ...settings, slides: updatedSlides };
                      onUpdateSettings(updated);
                      saveTVAdSettings(updated);
                    }}
                    placeholder="Custom subtitle / slogan (optional)..."
                    className="text-[11px] text-slate-400 bg-transparent border-b border-transparent hover:border-slate-700 focus:border-blue-500 focus:outline-none w-full truncate mt-0.5"
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Reorder Up / Down */}
                  <div className="flex flex-col gap-0.5">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => handleMoveSlide(index, 'up')}
                      className={`p-1 rounded text-slate-400 border border-slate-700 transition ${
                        index === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:text-white hover:bg-slate-800 cursor-pointer'
                      }`}
                      title="Move slide up in rotation order"
                    >
                      <ArrowUp className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      disabled={index === settings.slides.length - 1}
                      onClick={() => handleMoveSlide(index, 'down')}
                      className={`p-1 rounded text-slate-400 border border-slate-700 transition ${
                        index === settings.slides.length - 1 ? 'opacity-30 cursor-not-allowed' : 'hover:text-white hover:bg-slate-800 cursor-pointer'
                      }`}
                      title="Move slide down in rotation order"
                    >
                      <ArrowDown className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Fit toggle */}
                  <button
                    type="button"
                    onClick={() => handleToggleFit(slide.id)}
                    className={`px-2 py-1 rounded text-[10px] font-mono font-bold border transition cursor-pointer ${
                      slide.fit === 'cover'
                        ? 'bg-blue-600/20 text-blue-300 border-blue-500/40'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                    title="Toggle fit: Cover (fills screen edge-to-edge) vs Contain (shows full asset)"
                  >
                    {slide.fit === 'cover' ? 'Fit: Cover' : 'Fit: Contain'}
                  </button>

                  {/* Active Toggle */}
                  <button
                    type="button"
                    onClick={() => handleToggleSlide(slide.id)}
                    className={`px-2 py-1 rounded text-[10px] font-bold border transition cursor-pointer ${
                      slide.active !== false
                        ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-slate-800 text-slate-500 border-slate-700'
                    }`}
                  >
                    {slide.active !== false ? 'Live' : 'Hidden'}
                  </button>

                  {/* Delete */}
                  <button
                    type="button"
                    onClick={() => handleDeleteSlide(slide)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition cursor-pointer"
                    title="Remove slide"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          4. ADD BY URL MODAL
         ───────────────────────────────────────────────────────────── */}
      {showAddUrlModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-4">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Plus className="w-4 h-4 text-blue-400" />
              <span>Add Promo Banner by Image URL</span>
            </h4>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Image or Banner URL *
                </label>
                <input
                  type="url"
                  placeholder="https://... or /assets/logos/aie-claims.png"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Slide Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. AIE Skyline Fleet Solutions"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Subtitle / Slogan (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Premier PCO Vehicle Hire & Taxi Leasing"
                  value={newSubtitle}
                  onChange={(e) => setNewSubtitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddUrlModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddByUrl}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition shadow-md shadow-blue-900 cursor-pointer"
              >
                Add Promo Slide
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          5. PREVIEW MODAL
         ───────────────────────────────────────────────────────────── */}
      {previewSlide && (
        <div
          onClick={() => setPreviewSlide(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/90 backdrop-blur-md cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-4xl w-full bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl p-4 cursor-default"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h4 className="text-sm font-bold text-white">{previewSlide.title}</h4>
                {previewSlide.subtitle && (
                  <p className="text-xs text-slate-400">{previewSlide.subtitle}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setPreviewSlide(null)}
                className="px-3 py-1 text-xs bg-slate-800 text-slate-300 hover:text-white rounded-lg"
              >
                Close Preview
              </button>
            </div>
            <div className="mt-4 h-96 flex items-center justify-center bg-slate-950 rounded-xl overflow-hidden">
              {isVideoMedia(previewSlide.imageUrl) || previewSlide.mediaType === 'video' ? (
                <video
                  src={previewSlide.imageUrl}
                  autoPlay
                  loop
                  muted
                  playsInline
                  controls
                  className={`max-w-full max-h-full ${
                    previewSlide.fit === 'cover' ? 'object-cover w-full h-full' : 'object-contain'
                  }`}
                />
              ) : (
                <img
                  src={previewSlide.imageUrl}
                  alt={previewSlide.title || 'Slide Preview'}
                  className={`max-w-full max-h-full ${
                    previewSlide.fit === 'cover' ? 'object-cover w-full h-full' : 'object-contain'
                  }`}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TvAdMediaManager;
