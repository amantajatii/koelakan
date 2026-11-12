interface Entry<T> {
  at: number;
  value?: T;
  pending?: Promise<T>;
}

const store = new Map<string, Entry<unknown>>();

/** In-memory TTL cache that also de-duplicates concurrent identical requests. */
export function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const hit = store.get(key) as Entry<T> | undefined;
  if (hit?.pending) return hit.pending;
  if (hit && hit.value !== undefined && Date.now() - hit.at < ttlMs) return Promise.resolve(hit.value);
  const pending = load().then(
    (value) => {
      store.set(key, { at: Date.now(), value });
      return value;
    },
    (err: unknown) => {
      if (hit?.value !== undefined) store.set(key, { at: hit.at, value: hit.value });
      else store.delete(key);
      throw err;
    },
  );
  store.set(key, { at: hit?.at ?? 0, value: hit?.value, pending });
  return pending;
}

export function invalidate(prefix: string): void {
  for (const k of store.keys()) if (k.startsWith(prefix)) store.delete(k);
}
