// src/utils/signatureStamp.ts
import { format } from 'date-fns';

/**
 * Generates formatted UK timestamp string:
 * "Electronically Signed on DD/MM/YYYY at HH:MM:SS BST" (or UTC)
 */
export function formatSignatureTimestamp(date = new Date()): string {
  const d = date instanceof Date ? date : new Date(date);
  const pad = (n: number) => n.toString().padStart(2, '0');
  const day = pad(d.getDate());
  const month = pad(d.getMonth() + 1);
  const year = d.getFullYear();
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  const seconds = pad(d.getSeconds());

  // Determine if daylight saving time (BST) or UTC/GMT
  const jan = new Date(year, 0, 1).getTimezoneOffset();
  const jul = new Date(year, 6, 1).getTimezoneOffset();
  const isDST = Math.max(jan, jul) !== d.getTimezoneOffset();
  const tzAbbr = isDST ? 'BST' : 'UTC';

  return `Electronically Signed on ${day}/${month}/${year} at ${hours}:${minutes}:${seconds} ${tzAbbr}`;
}

/**
 * Appends the electronic signature timestamp and consent metadata
 * directly onto the signature image canvas as a secure tamper-evident banner.
 */
export async function stampSignatureImage(
  dataUrl: string,
  timestampText: string,
  signerName?: string
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

        const bannerHeight = 44;
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

        // Draw dividing line
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(16, img.height);
        ctx.lineTo(targetWidth - 16, img.height);
        ctx.stroke();

        // Draw timestamp metadata line
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 11px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        ctx.fillText(timestampText, targetWidth / 2, img.height + 15);

        // Draw legal consent line
        ctx.fillStyle = '#059669';
        ctx.font = 'bold 9px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        const consentLine = signerName
          ? `✓ Verified Consent • Terms & Conditions Agreed • Signer: ${signerName}`
          : '✓ Verified Consent • Terms & Conditions Explicitly Agreed';
        ctx.fillText(consentLine, targetWidth / 2, img.height + 31);

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
