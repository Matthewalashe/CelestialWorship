/**
 * Links people type (websites, maps, livestreams, social pages) and links we render from other
 * people's content. Only https is allowed — the database checks the same (PRINCIPLES §3).
 */

/** Tidy a typed link: adds https:// to "www.example.org", upgrades http://. null = empty, undefined = not a valid link. */
export function normalizeHttpsUrl(input: string | null | undefined): string | null | undefined {
  const raw = (input ?? '').trim();
  if (!raw) return null;
  const withScheme = /^[a-z][a-z\d+.-]*:/i.test(raw) ? raw.replace(/^http:\/\//i, 'https://') : `https://${raw}`;
  try {
    const u = new URL(withScheme);
    if (u.protocol !== 'https:' || !u.hostname.includes('.') || withScheme.length > 2048) return undefined;
    return u.toString();
  } catch {
    return undefined;
  }
}

/** A link from stored content that is safe to put in href; undefined when it isn't https. */
export function safeHref(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  try {
    return new URL(url).protocol === 'https:' ? url : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Normalise named links for saving. Throws with the field label when one is invalid, so the form
 * can say which link to fix.
 */
export function normalizeLinks<T extends Record<string, string | null | undefined>>(links: T, labels: Partial<Record<keyof T, string>> = {}): { [K in keyof T]: string | null } {
  const out = {} as { [K in keyof T]: string | null };
  for (const key of Object.keys(links) as (keyof T)[]) {
    const value = normalizeHttpsUrl(links[key]);
    if (value === undefined) throw new Error(`${labels[key] ?? String(key)} isn’t a valid https:// link`);
    out[key] = value;
  }
  return out;
}
