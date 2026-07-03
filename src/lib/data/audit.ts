/**
 * Audit log — append-only, hashed record of every local mutation.
 *
 * Stores only SHA-256 digests of payloads, never plaintext. Used for
 * tamper-evidence in the pipeline indicator and forensic inspection.
 */
import { getDB } from './db';

const enc = new TextEncoder();

async function sha256(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(input) as BufferSource);
  const bytes = new Uint8Array(buf);
  let hex = '';
  for (let i = 0; i < bytes.length; i++) hex += bytes[i].toString(16).padStart(2, '0');
  return hex;
}

export interface AuditEntryInput {
  userId: string;
  table: string;
  op: 'insert' | 'update' | 'delete' | 'server-upsert' | 'server-delete' | 'rotate-key';
  entityId: string;
  payload?: unknown;
  meta?: Record<string, any>;
}

export async function auditLog({ userId, table, op, entityId, payload, meta }: AuditEntryInput): Promise<void> {
  try {
    const db = await getDB(userId);
    const hash = payload == null ? '' : await sha256(JSON.stringify(payload));
    await db.put('audit_log' as any, {
      id: crypto.randomUUID(),
      at: Date.now(),
      table, op, entityId, hash, meta,
    });
  } catch { /* audit failures must never break the write path */ }
}

export async function readAudit(userId: string, limit = 100): Promise<any[]> {
  const db = await getDB(userId);
  const all = await db.getAllFromIndex('audit_log' as any, 'by-at' as any);
  return (all as any[]).slice(-limit).reverse();
}

export async function purgeAudit(userId: string, olderThanMs = 30 * 24 * 60 * 60 * 1000): Promise<number> {
  const db = await getDB(userId);
  const cutoff = Date.now() - olderThanMs;
  const all = await db.getAll('audit_log' as any);
  const tx = db.transaction('audit_log' as any, 'readwrite');
  let removed = 0;
  for (const row of all as any[]) {
    if (row.at < cutoff) { await tx.store.delete(row.id); removed++; }
  }
  await tx.done;
  return removed;
}
