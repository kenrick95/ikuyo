const STORAGE_PREFIX = 'ikuyo:webmcp:idempotency:';
const memory = new Map<string, string>();
const inFlight = new Map<
  string,
  { fingerprint: string; promise: Promise<object> }
>();

type StoredResult<T> = { fingerprint: string; result: T };

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

/** Compact deterministic FNV-1a hash so retry storage never contains tool input. */
function hash(value: string): string {
  let result = 0xcbf29ce484222325n;
  for (let index = 0; index < value.length; index++) {
    result ^= BigInt(value.charCodeAt(index));
    result = BigInt.asUintN(64, result * 0x100000001b3n);
  }
  return result.toString(36);
}

function storage(): Storage | undefined {
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage;
  } catch {
    return undefined;
  }
}

function readStored(
  store: Storage | undefined,
  key: string,
): string | undefined {
  try {
    return store?.getItem(key) ?? memory.get(key);
  } catch {
    return memory.get(key);
  }
}

function writeStored(
  store: Storage | undefined,
  key: string,
  value: string,
): void {
  memory.set(key, value);
  try {
    store?.setItem(key, value);
  } catch {
    // In-memory protection still covers the current tab when storage is full
    // or disabled. A successful write must never be reported as failed merely
    // because the retry cache could not be persisted.
  }
}

export function idempotencyKeySchema(): Record<string, unknown> {
  return {
    type: 'string',
    minLength: 1,
    maxLength: 200,
    description:
      'Optional caller-generated retry key. Reusing it with the same input returns the prior result without another write; reusing it with different input is rejected.',
  };
}

/** Browser-persistent retry protection for WebMCP create calls. */
export async function runIdempotent<T extends object>(
  operation: string,
  scope: string,
  key: unknown,
  input: Record<string, unknown>,
  create: () => Promise<T>,
): Promise<T & { idempotentReplay?: boolean }> {
  if (key === undefined) return create();
  if (typeof key !== 'string' || key.length === 0 || key.length > 200) {
    throw new Error(
      'idempotencyKey must be a non-empty string of at most 200 characters',
    );
  }
  const store = storage();
  const storageKey = `${STORAGE_PREFIX}${hash(`${operation}:${scope}:${key}`)}`;
  const fingerprint = hash(canonical({ ...input, idempotencyKey: undefined }));
  const raw = readStored(store, storageKey);
  if (raw) {
    const saved = JSON.parse(raw) as StoredResult<T>;
    if (saved.fingerprint !== fingerprint) {
      throw new Error(
        'idempotencyKey was already used for different input in this operation and scope',
      );
    }
    return { ...saved.result, idempotentReplay: true };
  }
  const pending = inFlight.get(storageKey);
  if (pending) {
    if (pending.fingerprint !== fingerprint) {
      throw new Error(
        'idempotencyKey was already used for different input in this operation and scope',
      );
    }
    return (await pending.promise) as T;
  }
  const promise = create();
  inFlight.set(storageKey, { fingerprint, promise });
  try {
    const result = await promise;
    const serialized = JSON.stringify({ fingerprint, result });
    writeStored(store, storageKey, serialized);
    return result;
  } finally {
    inFlight.delete(storageKey);
  }
}
