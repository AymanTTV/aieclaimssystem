// src/utils/tvAdMediaService.ts
import { db, storage } from '../lib/firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';

export type TVAdRotationSequence = 'after_each_page' | 'after_all_pages';

export interface TVAdSlide {
  id: string;
  title: string;
  subtitle?: string;
  imageUrl: string;
  storagePath?: string;
  fit?: 'contain' | 'cover';
  mediaType?: 'image' | 'video';
  fileName?: string;
  hasCustomTitle?: boolean;
  createdAt?: number;
  active?: boolean;
}

export const isVideoMedia = (url?: string): boolean => {
  if (!url) return false;
  const cleanUrl = url.split('?')[0].toLowerCase();
  return (
    cleanUrl.endsWith('.mp4') ||
    cleanUrl.endsWith('.webm') ||
    cleanUrl.endsWith('.ogg') ||
    cleanUrl.endsWith('.mov') ||
    cleanUrl.endsWith('.m4v') ||
    url.includes('video/') ||
    url.startsWith('data:video/')
  );
};

export interface TVAdSettings {
  enabled: boolean;
  duration: number; // Duration in seconds (e.g. 10, 15, 30)
  rotationSequence: TVAdRotationSequence;
  slides: TVAdSlide[];
}

export const DEFAULT_TV_AD_SETTINGS: TVAdSettings = {
  enabled: true,
  duration: 15,
  rotationSequence: 'after_each_page',
  slides: [
    {
      id: 'default-slide-1',
      title: 'AIE Skyline Fleet Solutions',
      subtitle: 'Premier PCO Vehicle Hire, Taxi Leasing & Luxury Fleet Operations',
      imageUrl: '/share-image.jpg',
      fit: 'cover',
      mediaType: 'image',
      hasCustomTitle: true,
      active: true,
      createdAt: Date.now() - 3000,
    },
    {
      id: 'default-slide-2',
      title: 'AIE Claims 24/7 Rapid Recovery',
      subtitle: 'Credit Hire, Immediate VOR Vehicle Replacement & Legal Recovery Services',
      imageUrl: '/assets/logos/aie-claims.png',
      fit: 'contain',
      mediaType: 'image',
      hasCustomTitle: true,
      active: true,
      createdAt: Date.now() - 2000,
    },
    {
      id: 'default-slide-3',
      title: 'Workshop Fleet MOT & Scheduled Servicing',
      subtitle: 'Priority Bay Turnaround, Brake Testing, Diagnostics & VOR Expedited Repairs',
      imageUrl: '/assets/logos/aie-skyline.png',
      fit: 'contain',
      mediaType: 'image',
      hasCustomTitle: true,
      active: true,
      createdAt: Date.now() - 1000,
    },
  ],
};

const LOCAL_STORAGE_KEY = 'workshop_tv_ad_settings';
export const SETTINGS_COLLECTION = 'settings';
export const SETTINGS_DOC_ID = 'workshop_tv_ads';

// ─────────────────────────────────────────────────────────────
// 3. BACKGROUND IMAGE & VIDEO PRELOADING
// Preloads all slide URLs in the browser memory/cache so screens
// switch seamlessly without blank loading flashes.
// ─────────────────────────────────────────────────────────────
const preloadedUrls = new Set<string>();

export const preloadSlideMedia = (slides: TVAdSlide[]): void => {
  if (typeof window === 'undefined' || !Array.isArray(slides)) return;

  slides.forEach((slide) => {
    if (!slide || !slide.imageUrl || preloadedUrls.has(slide.imageUrl)) return;

    const isVid = slide.mediaType === 'video' || isVideoMedia(slide.imageUrl);

    if (isVid) {
      try {
        const video = document.createElement('video');
        video.preload = 'auto';
        video.src = slide.imageUrl;
        video.muted = true;
        video.onloadeddata = () => {
          preloadedUrls.add(slide.imageUrl);
        };
      } catch (err) {
        console.warn('Video preload warning:', slide.imageUrl, err);
      }
    } else {
      try {
        const img = new Image();
        img.src = slide.imageUrl;
        img.onload = () => {
          preloadedUrls.add(slide.imageUrl);
        };
      } catch (err) {
        console.warn('Image preload warning:', slide.imageUrl, err);
      }
    }
  });
};

/**
 * 1. Live Firestore Sync for TV Advertisements:
 * Real-time listener (`onSnapshot`) on settings/workshop_tv_ads.
 * Instantly broadcasts updates to all open Workshop TV screens.
 */
export const subscribeTVAdSettings = (
  callback: (settings: TVAdSettings) => void
): (() => void) => {
  const docRef = doc(db, SETTINGS_COLLECTION, SETTINGS_DOC_ID);

  const unsubscribe = onSnapshot(
    docRef,
    (snap) => {
      if (snap.exists()) {
        const data = snap.data() as Partial<TVAdSettings>;
        const merged: TVAdSettings = {
          enabled: data.enabled !== undefined ? Boolean(data.enabled) : DEFAULT_TV_AD_SETTINGS.enabled,
          duration: typeof data.duration === 'number' ? data.duration : DEFAULT_TV_AD_SETTINGS.duration,
          rotationSequence: data.rotationSequence || DEFAULT_TV_AD_SETTINGS.rotationSequence,
          slides: Array.isArray(data.slides) && data.slides.length > 0 ? data.slides : DEFAULT_TV_AD_SETTINGS.slides,
        };

        // Preload all incoming slides in the background
        preloadSlideMedia(merged.slides);

        // Keep local cache in sync for offline resilience
        try {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(merged));
        } catch {}

        callback(merged);
      } else {
        // Document does not exist yet: seed settings/workshop_tv_ads with defaults
        const initial = DEFAULT_TV_AD_SETTINGS;
        setDoc(docRef, { ...initial, updatedAt: new Date().toISOString() }, { merge: true }).catch(console.warn);
        preloadSlideMedia(initial.slides);
        callback(initial);
      }
    },
    (error) => {
      console.warn('Firestore onSnapshot listener error for TV Ads:', error);
      // Fallback to local storage if network or permissions fail
      try {
        const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          preloadSlideMedia(parsed.slides || []);
          callback(parsed);
        }
      } catch {}
    }
  );

  return unsubscribe;
};

/**
 * Load persistent Ad & Promo settings from Firestore or LocalStorage
 */
export const loadTVAdSettings = async (): Promise<TVAdSettings> => {
  // 1. Try local storage first for instant synchronous/cached response
  let cachedSettings: TVAdSettings | null = null;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      cachedSettings = JSON.parse(raw);
      if (cachedSettings?.slides) {
        preloadSlideMedia(cachedSettings.slides);
      }
    }
  } catch (err) {
    console.warn('Could not read cached TV ad settings:', err);
  }

  // 2. Fetch live settings from centralized settings/workshop_tv_ads
  try {
    const docRef = doc(db, SETTINGS_COLLECTION, SETTINGS_DOC_ID);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as Partial<TVAdSettings>;
      const merged: TVAdSettings = {
        enabled: data.enabled ?? cachedSettings?.enabled ?? DEFAULT_TV_AD_SETTINGS.enabled,
        duration: data.duration ?? cachedSettings?.duration ?? DEFAULT_TV_AD_SETTINGS.duration,
        rotationSequence:
          data.rotationSequence ?? cachedSettings?.rotationSequence ?? DEFAULT_TV_AD_SETTINGS.rotationSequence,
        slides:
          Array.isArray(data.slides) && data.slides.length > 0
            ? data.slides
            : cachedSettings?.slides?.length
            ? cachedSettings.slides
            : DEFAULT_TV_AD_SETTINGS.slides,
      };

      preloadSlideMedia(merged.slides);

      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(merged));
      } catch {}
      return merged;
    }
  } catch (err) {
    console.warn('Could not fetch Firestore TV ad settings:', err);
  }

  return cachedSettings || DEFAULT_TV_AD_SETTINGS;
};

/**
 * 2. Instant Cross-Screen Auto-Update:
 * Save Ad & Promo settings to Firestore (settings/workshop_tv_ads)
 * All open TV screens listening via onSnapshot update immediately!
 */
export const saveTVAdSettings = async (settings: TVAdSettings): Promise<void> => {
  // 1. Immediately trigger background preloading on the local client
  preloadSlideMedia(settings.slides);

  // 2. Save immediately to LocalStorage
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(settings));
  } catch (err) {
    console.warn('Could not save to LocalStorage:', err);
  }

  // 3. Persist to centralized Firestore settings/workshop_tv_ads
  const payload = {
    ...settings,
    updatedAt: new Date().toISOString(),
  };

  try {
    const docRef = doc(db, SETTINGS_COLLECTION, SETTINGS_DOC_ID);
    await setDoc(docRef, payload, { merge: true });
  } catch (err) {
    console.warn('Could not persist to settings/workshop_tv_ads, trying companySettings fallback:', err);
    try {
      const fallbackRef = doc(db, 'companySettings', 'workshopTvAds');
      await setDoc(fallbackRef, payload, { merge: true });
    } catch {}
  }
};

/**
 * Upload an image or video file to Firebase Storage with a Base64 Data URL fallback
 */
export const uploadAdSlideMedia = async (
  file: File
): Promise<{ url: string; storagePath?: string }> => {
  const fileExt = file.name.split('.').pop() || (file.type.startsWith('video/') ? 'mp4' : 'png');
  const fileName = `${Date.now()}_${uuidv4().slice(0, 8)}.${fileExt}`;
  const storagePath = `workshop_tv_ads/${fileName}`;

  try {
    const storageRef = ref(storage, storagePath);
    const snap = await uploadBytes(storageRef, file, {
      contentType: file.type || (file.type.startsWith('video/') ? 'video/mp4' : 'image/png'),
      cacheControl: 'public,max-age=86400',
    });
    const url = await getDownloadURL(snap.ref);
    return { url, storagePath };
  } catch (storageError) {
    console.warn('Firebase storage upload failed, converting to Data URL fallback:', storageError);
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve({ url: reader.result });
        } else {
          reject(new Error('Failed to convert file to data URL'));
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }
};

/**
 * Delete an uploaded media file from Firebase Storage
 */
export const deleteAdSlideMedia = async (storagePath?: string): Promise<void> => {
  if (!storagePath) return;
  try {
    const storageRef = ref(storage, storagePath);
    await deleteObject(storageRef);
  } catch (err) {
    console.warn('Could not delete storage file:', err);
  }
};
