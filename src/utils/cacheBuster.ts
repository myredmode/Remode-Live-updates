/**
 * Product & Media Image Cache-Busting Strategy
 *
 * Generates version hashes/timestamps and appends (?v=...) to image URLs.
 * Forces browser cache invalidation across Frontstore and Admin Panel
 * whenever a merchant updates product or category photos in Firestore.
 */

/**
 * Generates a unique version string consisting of the current timestamp
 * and an optional random alphanumeric suffix (e.g., '1731052800123' or '1731052800123_8f2a').
 */
export function generateVersionString(includeRandom = false): string {
  const timestamp = Date.now().toString();
  if (!includeRandom) return timestamp;
  const rand = Math.random().toString(36).substring(2, 7);
  return `${timestamp}_${rand}`;
}

/**
 * Appends or updates a version query parameter (?v=...) on an image URL.
 * Preserves Base64 data: URLs and in-memory blob: URLs without altering them.
 *
 * @param url The image URL (relative path, CDN, or external HTTP/HTTPS URL)
 * @param version Optional custom version or timestamp. If omitted, generates current timestamp.
 */
export function appendVersionToImageUrl(
  url?: string | null,
  version?: string | number | null
): string {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';

  // Data URLs (base64) and Blob URLs do not use HTTP browser caching
  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return trimmed;
  }

  // Derive version key (sanitize to safe URL characters)
  const v = version != null && String(version).trim()
    ? String(version).trim().replace(/[^a-zA-Z0-9_-]/g, '')
    : generateVersionString();

  if (!v) return trimmed;

  // If a ?v= or &v= parameter already exists in the URL, replace it
  if (trimmed.match(/[?&]v=[^&]*/)) {
    return trimmed.replace(/([?&]v=)[^&]*/, `$1${v}`);
  }

  const separator = trimmed.includes('?') ? '&' : '?';
  return `${trimmed}${separator}v=${v}`;
}

/**
 * Primary Cache-Busting resolver for components.
 * Takes an image URL and a version (e.g. product.updatedAt or category.updatedAt).
 *
 * @param url The image URL
 * @param versionOrTimestamp Product or Category updatedAt timestamp, or version hash
 */
export function getCacheBustedUrl(
  url?: string | null,
  versionOrTimestamp?: string | number | null
): string {
  return appendVersionToImageUrl(url, versionOrTimestamp);
}
