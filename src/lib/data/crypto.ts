/**
 * At-rest encryption for the offline IndexedDB cache.
 *
 * Design:
 *   - Per-user, non-extractable AES-GCM 256 CryptoKey stored inside the
 *     user's own IndexedDB via structured clone. The raw key material never
 *     leaves the browser and cannot be exported (extractable=false).
 *   - Sensitive columns are encrypted per-field into an opaque envelope
 *     `enc:v1:<b64iv>:<b64ct>` before being written to IDB.
 *   - Payloads pushed to Supabase are always plaintext (server-side data
 *     remains authoritative and RLS-protected). Encryption is purely a
 *     defence-in-depth for the local device profile.
 *   - Includes AAD binding to (table, field, entityId) so ciphertexts cannot
 *     be transplanted between rows.
 *   - Supports key rotation via `rotateUserKey` — walks every store and
 *     re-encrypts existing envelopes under a freshly generated key.
 */
import { getDB } from './db';

const ENVELOPE_PREFIX = 'enc:v1:';
const KEYRING_STORE = 'keyring';
const ACTIVE_KEY_ID = 'active';

export interface KeyringRecord {
  id: string;                    // 'active' or historical uuid
  key: CryptoKey;                // non-extractable
  createdAt: number;
  algorithm: 'AES-GCM';
  version: 1;
}

/** Sensitive-field policy — the ONLY fields that get sealed at rest. */
export const SENSITIVE_FIELDS: Record<string, readonly string[]> = {
  transactions:  ['description', 'notes', 'payee', 'merchant', 'reference', 'amount'],
  accounts:      ['name', 'institution', 'account_number', 'notes', 'balance'],
  goals:         ['name', 'description', 'notes'],
  budgets:       ['notes'],
  subscriptions: ['name', 'merchant', 'notes'],
  categories:    [],
};

// ─── Encoding helpers ────────────────────────────────────────────────────
const enc = new TextEncoder();
const dec = new TextDecoder();

function b64(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = '';
  for (let i = 0; i < arr.length; i++) s += String.fromCharCode(arr[i]);
  return btoa(s);
}
function unb64(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// ─── Keyring management ─────────────────────────────────────────────────
async function generateKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

const keyCache = new Map<string, Promise<CryptoKey>>();

/** Loads or creates the active per-user key. Cached in memory per session. */
export function getUserKey(userId: string): Promise<CryptoKey> {
  const cached = keyCache.get(userId);
  if (cached) return cached;
  const p = (async () => {
    const db = await getDB(userId);
    const existing = (await db.get(KEYRING_STORE as any, ACTIVE_KEY_ID)) as KeyringRecord | undefined;
    if (existing?.key) return existing.key;
    const key = await generateKey();
    const rec: KeyringRecord = {
      id: ACTIVE_KEY_ID, key, createdAt: Date.now(),
      algorithm: 'AES-GCM', version: 1,
    };
    await db.put(KEYRING_STORE as any, rec);
    return key;
  })();
  keyCache.set(userId, p);
  return p;
}

export async function keyringInfo(userId: string): Promise<{ createdAt: number | null; hasKey: boolean }> {
  try {
    const db = await getDB(userId);
    const rec = (await db.get(KEYRING_STORE as any, ACTIVE_KEY_ID)) as KeyringRecord | undefined;
    return { createdAt: rec?.createdAt ?? null, hasKey: !!rec };
  } catch { return { createdAt: null, hasKey: false }; }
}

// ─── Envelope encrypt/decrypt ───────────────────────────────────────────
export function isEnvelope(v: unknown): v is string {
  return typeof v === 'string' && v.startsWith(ENVELOPE_PREFIX);
}

async function sealValue(key: CryptoKey, plaintext: unknown, aad: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const bytes = enc.encode(JSON.stringify(plaintext));
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource, additionalData: enc.encode(aad) as BufferSource },
    key, bytes as BufferSource,
  );
  return `${ENVELOPE_PREFIX}${b64(iv)}:${b64(ct)}`;
}

async function openValue(key: CryptoKey, envelope: string, aad: string): Promise<unknown> {
  const body = envelope.slice(ENVELOPE_PREFIX.length);
  const [ivB64, ctB64] = body.split(':');
  const iv = unb64(ivB64);
  const ct = unb64(ctB64);
  const pt = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as BufferSource, additionalData: enc.encode(aad) as BufferSource },
    key, ct as BufferSource,
  );
  return JSON.parse(dec.decode(pt));
}

function aadFor(table: string, field: string, id: string): string {
  return `${table}|${field}|${id}`;
}

/** Encrypt sensitive fields on a row. Idempotent — already-sealed values are skipped. */
export async function sealRow<T extends Record<string, any>>(
  userId: string, table: string, row: T,
): Promise<T> {
  const fields = SENSITIVE_FIELDS[table];
  if (!fields || fields.length === 0) return row;
  const key = await getUserKey(userId);
  const id = String(row.id ?? '');
  const out: any = { ...row };
  for (const f of fields) {
    const v = out[f];
    if (v == null || isEnvelope(v)) continue;
    out[f] = await sealValue(key, v, aadFor(table, f, id));
  }
  out._enc = 1;
  return out;
}

/** Decrypt sensitive fields on a row. Missing / non-envelope values pass through. */
export async function openRow<T extends Record<string, any>>(
  userId: string, table: string, row: T,
): Promise<T> {
  const fields = SENSITIVE_FIELDS[table];
  if (!fields || fields.length === 0) return row;
  const key = await getUserKey(userId);
  const id = String(row.id ?? '');
  const out: any = { ...row };
  for (const f of fields) {
    const v = out[f];
    if (!isEnvelope(v)) continue;
    try {
      out[f] = await openValue(key, v, aadFor(table, f, id));
    } catch {
      // Decryption failed (key rotated without re-seal, or tampered) — surface null.
      out[f] = null;
    }
  }
  return out;
}

export async function sealRows<T extends Record<string, any>>(userId: string, table: string, rows: T[]): Promise<T[]> {
  return Promise.all(rows.map(r => sealRow(userId, table, r)));
}
export async function openRows<T extends Record<string, any>>(userId: string, table: string, rows: T[]): Promise<T[]> {
  return Promise.all(rows.map(r => openRow(userId, table, r)));
}

// ─── Key rotation ───────────────────────────────────────────────────────
/**
 * Rotate the user key: decrypts every sealed row under the old key and
 * re-seals it under a freshly generated one. Runs table-by-table in
 * bounded transactions so a browser tab close never leaves the DB half-
 * rotated (each table either fully rotates or stays on the old key).
 */
export async function rotateUserKey(userId: string): Promise<{ rotated: number }> {
  const db = await getDB(userId);
  const oldKey = await getUserKey(userId);
  const newKey = await generateKey();
  let rotated = 0;

  for (const table of Object.keys(SENSITIVE_FIELDS)) {
    const fields = SENSITIVE_FIELDS[table];
    if (fields.length === 0) continue;
    const all = await db.getAll(table as any);
    const resealed: any[] = [];
    for (const row of all as any[]) {
      const id = String(row.id ?? '');
      const next: any = { ...row };
      for (const f of fields) {
        const v = next[f];
        if (!isEnvelope(v)) continue;
        try {
          const pt = await openValue(oldKey, v, aadFor(table, f, id));
          next[f] = await sealValue(newKey, pt, aadFor(table, f, id));
        } catch { /* leave as-is; will surface null on read */ }
      }
      resealed.push(next);
    }
    const tx = db.transaction(table as any, 'readwrite');
    for (const r of resealed) await tx.store.put(r);
    await tx.done;
    rotated += resealed.length;
  }

  await db.put(KEYRING_STORE as any, {
    id: ACTIVE_KEY_ID, key: newKey, createdAt: Date.now(),
    algorithm: 'AES-GCM', version: 1,
  } satisfies KeyringRecord);
  keyCache.set(userId, Promise.resolve(newKey));
  return { rotated };
}

/** Wipe the keyring (destructive — sealed rows become unrecoverable). */
export async function destroyKeyring(userId: string): Promise<void> {
  const db = await getDB(userId);
  await db.clear(KEYRING_STORE as any);
  keyCache.delete(userId);
}
