// src/utils/signatureStamp.ts
import { format } from 'date-fns';

/**
 * Generates formatted timestamp string mirroring backdated rental start date/time:
 * e.g. "DD/MM/YYYY HH:mm" or "Date: DD/MM/YYYY HH:mm"
 */
export function formatSignatureTimestamp(date: Date | string = new Date(), prefix = ''): string {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => n.toString().padStart(2, '0');
  const day = pad(d.getDate());
  const month = pad(d.getMonth() + 1);
  const year = d.getFullYear();
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());

  const formatted = `${day}/${month}/${year} ${hours}:${minutes}`;
  return prefix ? `${prefix}${formatted}` : formatted;
}

/**
 * Appends the backdated execution timestamp and verified consent metadata
 * onto the signature image canvas cleanly without unwanted audit subtext.
 */
export async function stampSignatureImage(
  dataUrl: string,
  timestampText: string,
  signerName?: string,
  options?: { hideAuditSubtext?: boolean }
): Promise<string> {
  return new Promise((resolve) => {
    if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image')) {
      resolve(dataUrl);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }

        // Clean subtext cleanup: clean 32px banner or return pristine signature
        const bannerHeight = options?.hideAuditSubtext ? 0 : 36;
        const targetWidth = Math.max(img.width, 500);
        const targetHeight = img.height + bannerHeight;

        canvas.width = targetWidth;
        canvas.height = targetHeight;

        // Fill white background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, targetWidth, targetHeight);

        // Draw original signature centered
        const xOffset = Math.max(0, (targetWidth - img.width) / 2);
        ctx.drawImage(img, xOffset, 0);

        if (bannerHeight > 0 && timestampText) {
          // Clean dividing line
          ctx.strokeStyle = '#e2e8f0';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(16, img.height);
          ctx.lineTo(targetWidth - 16, img.height);
          ctx.stroke();

          // Clean backdated timestamp line - removes old "Electronically Signed on ... BST"
          const cleanTimestamp = timestampText.replace(/^Electronically Signed on\s*/i, 'Date: ');
          ctx.fillStyle = '#0f172a';
          ctx.font = 'bold 11px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          ctx.fillText(cleanTimestamp.startsWith('Date:') ? cleanTimestamp : `Date: ${cleanTimestamp}`, targetWidth / 2, img.height + 14);

          // Clean verified consent line
          ctx.fillStyle = '#059669';
          ctx.font = 'bold 9px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
          const consentLine = signerName
            ? `✓ Legally Signed & Verified • ${signerName}`
            : '✓ Legally Signed & Verified';
          ctx.fillText(consentLine, targetWidth / 2, img.height + 26);
        }

        resolve(canvas.toDataURL('image/png'));
      } catch (err) {
        console.warn('Could not stamp signature image canvas:', err);
        resolve(dataUrl);
      }
    };
    img.onerror = () => {
      resolve(dataUrl);
    };
    img.src = dataUrl;
  });
}
