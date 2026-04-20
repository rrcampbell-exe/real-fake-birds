export async function canLoadImage(url: string): Promise<boolean> {
  if (typeof window === 'undefined') {
    return false;
  }

  const normalizedUrl = url.trim();
  if (!normalizedUrl) {
    return false;
  }

  return new Promise((resolve) => {
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
}