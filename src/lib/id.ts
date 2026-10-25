/** Erzeugt eine eindeutige ID – auch in Umgebungen ohne crypto.randomUUID (z. B. http im Heimnetz). */
export function createId(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === 'function') {
    return c.randomUUID();
  }
  return `k-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
