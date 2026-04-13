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

/**
 * Render a shareable 1080×1080 card image for a report.
 * Returns a JPEG Blob, or null if the photo cannot be loaded (CORS etc.).
 */
export async function generateShareImage(
  photoUrl: string,
  categoryLabel: string,
  categoryColor: string,
  neighborhood: string | null,
): Promise<Blob | null> {
  const W = 1080, H = 1080;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = photoUrl;
    });

    const photoH = Math.round(H * 0.68);

    // Photo
    ctx.drawImage(img, 0, 0, W, photoH);

    // Gradient overlay at bottom of photo for readability
    const grad = ctx.createLinearGradient(0, photoH - 140, 0, photoH);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.5)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, photoH);

    // White card
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, photoH, W, H - photoH);

    // Orange left accent bar
    ctx.fillStyle = '#f97316';
    ctx.fillRect(0, photoH, 8, H - photoH);

    const pad = 48;

    // Category badge
    ctx.font = 'bold 30px system-ui, -apple-system, Arial, sans-serif';
    ctx.textBaseline = 'middle';
    const textW = ctx.measureText(categoryLabel).width;
    const bPad = 24, bH = 52;
    const bW = textW + bPad * 2;
    const bX = pad, bY = photoH + 36;

    ctx.fillStyle = categoryColor;
    roundRect(ctx, bX, bY, bW, bH, bH / 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.fillText(categoryLabel, bX + bPad, bY + bH / 2);

    // Neighborhood
    if (neighborhood) {
      ctx.font = '40px system-ui, -apple-system, Arial, sans-serif';
      ctx.fillStyle = '#111827';
      ctx.textBaseline = 'top';
      ctx.fillText(neighborhood, pad, photoH + 110);
    }

    // Watermark line
    ctx.font = '28px system-ui, -apple-system, Arial, sans-serif';
    ctx.fillStyle = '#9ca3af';
    ctx.textBaseline = 'bottom';
    ctx.fillText('0Déchets · 0dechets.com', pad, H - 36);

    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject()), 'image/jpeg', 0.92),
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
