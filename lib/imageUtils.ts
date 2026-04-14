/**
 * Compress an image File to stay under maxBytes (default 1MB).
 * Returns a new File with type image/jpeg.
 */
export async function compressImage(file: File, maxBytes = 1_000_000): Promise<File> {
  if (file.size <= maxBytes) return file;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      let { width, height } = img;

      // Scale down proportionally
      const scale = Math.sqrt(maxBytes / file.size);
      width = Math.round(width * scale);
      height = Math.round(height * scale);

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error('Compression failed'));
          const compressed = new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });
          resolve(compressed);
        },
        'image/jpeg',
        0.82,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/** Draw an image cropped to fill a box (object-fit: cover). */
function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number, y: number, w: number, h: number,
) {
  const imgAspect = img.naturalWidth / img.naturalHeight;
  const boxAspect = w / h;
  let sx: number, sy: number, sw: number, sh: number;
  if (imgAspect > boxAspect) {
    sh = img.naturalHeight;
    sw = sh * boxAspect;
    sx = (img.naturalWidth - sw) / 2;
    sy = 0;
  } else {
    sw = img.naturalWidth;
    sh = sw / boxAspect;
    sx = 0;
    sy = (img.naturalHeight - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

/** Truncate text to fit within maxWidth, appending '…' if needed. */
function truncate(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + '…').width > maxWidth) t = t.slice(0, -1);
  return t + '…';
}

/**
 * Render a compact shareable card.
 *
 * Layout: white bg → orange bar → photo (padded, rounded, cover crop)
 *         → location (always shown) + date → slim footer
 *
 * Returns a JPEG Blob, or null if the photo cannot be loaded.
 */
export async function generateShareImage(
  photoUrl: string,
  categoryLabel: string,
  categoryColor: string,
  neighborhood: string | null,
  createdAt: string,
  latitude?: number,
  longitude?: number,
): Promise<Blob | null> {
  const W   = 1080;
  const PAD = 44; // horizontal padding throughout

  const canvas = document.createElement('canvas');
  canvas.width = W;
  const ctx = canvas.getContext('2d')!;

  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise<void>((resolve, reject) => {
      img.onload  = () => resolve();
      img.onerror = reject;
      img.src = photoUrl;
    });

    // ── Measurements ───────────────────────────────────────────────
    const BAR_H     = 8;
    const TOP_PAD   = 40;
    const PHOTO_W   = W - PAD * 2;          // 992 px
    const PHOTO_H   = Math.round(PHOTO_W * (img.naturalHeight / img.naturalWidth));
    // Cap photo height so landscape shots don't make the card too tall
    const PHOTO_H_CAPPED = Math.min(PHOTO_H, Math.round(PHOTO_W * 1.1));
    const PHOTO_X   = PAD;
    const PHOTO_Y   = BAR_H + TOP_PAD;
    const PHOTO_R   = 16;
    const GAP       = 32;                   // gap between photo and text
    const LOC_SIZE  = 46;
    const DATE_SIZE = 28;
    const FOOTER_H  = 56;
    const BOT_PAD   = 32;

    const H = BAR_H + TOP_PAD + PHOTO_H_CAPPED + GAP + LOC_SIZE + 12 + DATE_SIZE + GAP + FOOTER_H + BOT_PAD;
    canvas.height = H;

    // ── White background ───────────────────────────────────────────
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);

    // ── Orange top bar ─────────────────────────────────────────────
    ctx.fillStyle = '#f97316';
    ctx.fillRect(0, 0, W, BAR_H);

    // ── Photo (shadow → clip → cover draw) ─────────────────────────
    ctx.save();
    ctx.shadowColor   = 'rgba(0,0,0,0.12)';
    ctx.shadowBlur    = 24;
    ctx.shadowOffsetY = 6;
    ctx.fillStyle = '#ffffff';
    roundRect(ctx, PHOTO_X, PHOTO_Y, PHOTO_W, PHOTO_H_CAPPED, PHOTO_R);
    ctx.fill();
    ctx.restore();

    ctx.save();
    roundRect(ctx, PHOTO_X, PHOTO_Y, PHOTO_W, PHOTO_H_CAPPED, PHOTO_R);
    ctx.clip();
    drawImageCover(ctx, img, PHOTO_X, PHOTO_Y, PHOTO_W, PHOTO_H_CAPPED);
    ctx.restore();

    // Category badge — overlaid bottom-left of photo
    const BADGE_PX = 22, BADGE_H = 48;
    ctx.font = `bold 26px system-ui, -apple-system, Arial, sans-serif`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    const BADGE_W = ctx.measureText(categoryLabel).width + BADGE_PX * 2;
    const BADGE_X = PHOTO_X + 20;
    const BADGE_Y = PHOTO_Y + PHOTO_H_CAPPED - BADGE_H - 20;

    ctx.fillStyle = categoryColor;
    roundRect(ctx, BADGE_X, BADGE_Y, BADGE_W, BADGE_H, BADGE_H / 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillText(categoryLabel, BADGE_X + BADGE_PX, BADGE_Y + BADGE_H / 2);

    // ── Location (always shown) ────────────────────────────────────
    // Prefer neighborhood name; fall back to coordinates (always specific)
    const location = neighborhood
      ?? (latitude != null && longitude != null
        ? `${Math.abs(latitude).toFixed(4)}°${latitude >= 0 ? 'N' : 'S'}, ${Math.abs(longitude).toFixed(4)}°${longitude >= 0 ? 'E' : 'W'}`
        : null);
    let textY = PHOTO_Y + PHOTO_H_CAPPED + GAP;

    // Pin dot
    const DOT_R = 10;
    const DOT_X = PAD + DOT_R;
    const DOT_Y = textY + LOC_SIZE / 2;
    ctx.beginPath();
    ctx.arc(DOT_X, DOT_Y, DOT_R, 0, Math.PI * 2);
    ctx.fillStyle = categoryColor;
    ctx.fill();

    // Location text — offset right of dot
    const LOC_X = PAD + DOT_R * 2 + 14;
    if (location) {
      ctx.font = `bold ${LOC_SIZE}px system-ui, -apple-system, Arial, sans-serif`;
      ctx.fillStyle = '#111827';
      ctx.textBaseline = 'top';
      ctx.textAlign = 'left';
      ctx.fillText(truncate(ctx, location, W - LOC_X - PAD), LOC_X, textY);
    }
    textY += LOC_SIZE + 12;

    // ── Date ───────────────────────────────────────────────────────
    const dateStr = new Date(createdAt).toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
    ctx.font = `${DATE_SIZE}px system-ui, -apple-system, Arial, sans-serif`;
    ctx.fillStyle = '#9ca3af';
    ctx.fillText(dateStr, LOC_X, textY);

    // ── Footer ─────────────────────────────────────────────────────
    const FOOTER_Y = H - BOT_PAD - FOOTER_H;

    ctx.strokeStyle = '#f3f4f6';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(PAD, FOOTER_Y);
    ctx.lineTo(W - PAD, FOOTER_Y);
    ctx.stroke();

    ctx.font = 'bold 28px system-ui, -apple-system, Arial, sans-serif';
    ctx.fillStyle = '#f97316';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('0dechets.com', W / 2, FOOTER_Y + FOOTER_H / 2);

    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject()), 'image/jpeg', 0.93),
    );
  } catch {
    return null;
  }
}

/**
 * Extract GPS coordinates from photo EXIF data.
 * Returns null if no GPS data found.
 */
export async function extractGpsFromExif(
  file: File,
): Promise<{ latitude: number; longitude: number } | null> {
  try {
    const exifr = await import('exifr');
    const gps = await exifr.gps(file);
    if (gps?.latitude != null && gps?.longitude != null) {
      return { latitude: gps.latitude, longitude: gps.longitude };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Get current position via browser geolocation API.
 */
export function getCurrentPosition(): Promise<{ latitude: number; longitude: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  });
}
