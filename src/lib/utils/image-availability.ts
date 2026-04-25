export async function canLoadImage(url: string): Promise<boolean> {
  if (typeof window === 'undefined') {
    return false;
  }

  const normalizedUrl = url.trim();
  if (!normalizedUrl) {
    return false;
  }

  const decodedByImg = await new Promise<boolean>((resolve) => {
    const image = new Image();
    let settled = false;

    const finish = (available: boolean) => {
      if (settled) {
        return;
      }

      settled = true;
      image.onload = null;
      image.onerror = null;
      resolve(available);
    };

    image.onload = () => finish(true);
    image.onerror = () => finish(false);
    image.src = normalizedUrl;

    if (image.complete) {
      finish(image.naturalWidth > 0);
    }
  });

  if (decodedByImg) {
    return true;
  }

  // Image failed to decode (e.g. iOS WKWebView can't handle certain WebP
  // profiles). Fall back to a HEAD request to confirm the resource exists.
  // If it does, return true and let the caller's fallback URL handle rendering.
  try {
    const res = await fetch(normalizedUrl, { method: 'HEAD', cache: 'no-store' });
    return res.ok;
  } catch {
    return false;
  }
}