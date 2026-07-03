/**
 * Typed repositories — cache-first read, write-through with offline queue.
 *
 * Reads decrypt sensitive fields on the fly; writes seal them before they
 * ever touch IDB. Every mutation is mirrored into the append-only audit
 * log with a SHA-256 fingerprint of the payload (no plaintext retained).
 * Server round-trips remain plaintext — encryption is a device-local
 * defence-in-depth layer, RLS remains the source of truth.
 */
import { getDB, type StoredEntity } from './db';
import { enqueue } from './offlineQueue';
import { sealRow, sealRows, openRow, openRows } from './crypto';
import { auditLog } from './audit';

type Table = 'transactions' | 'accounts' | 'budgets' | 'goals' | 'subscriptions' | 'categories';

export class Repository<T extends { id: string }> {
  constructor(private readonly table: Table, private readonly userId: string) {}

  async list(filter?: (row: StoredEntity<T>) => boolean): Promise<StoredEntity<T>[]> {
    const db = await getDB(this.userId);
    const all = (await db.getAll(this.table)) as StoredEntity<T>[];
    const live = all.filter(r => !r._deletedAt);
    const opened = (await openRows(this.userId, this.table, live)) as StoredEntity<T>[];
    return filter ? opened.filter(filter) : opened;
  }

  async get(id: string): Promise<StoredEntity<T> | undefined> {
    const db = await getDB(this.userId);
    const row = (await db.get(this.table, id)) as StoredEntity<T> | undefined;
    if (!row || row._deletedAt) return undefined;
    return openRow(this.userId, this.table, row) as Promise<StoredEntity<T>>;
  }

  async upsertFromServer(rows: T[] | T) {
    const db = await getDB(this.userId);
    const list = Array.isArray(rows) ? rows : [rows];
    const sealed = await sealRows(this.userId, this.table, list as any[]);
    const tx = db.transaction(this.table, 'readwrite');
    for (let i = 0; i < sealed.length; i++) {
      const r = sealed[i];
      const prev = (await tx.store.get(r.id)) as StoredEntity<T> | undefined;
      const merged: StoredEntity<T> = {
        ...(r as any),
        _syncStatus: 'clean',
        _localUpdatedAt: prev?._localUpdatedAt ?? Date.now(),
        _serverUpdatedAt: (list[i] as any).updated_at ?? new Date().toISOString(),
        _deletedAt: null,
      };
      await tx.store.put(merged as any);
    }
    await tx.done;
    for (const r of list) {
      void auditLog({ userId: this.userId, table: this.table, op: 'server-upsert', entityId: (r as any).id, payload: r });
    }
  }

  async removeFromServer(id: string) {
    const db = await getDB(this.userId);
    await db.delete(this.table, id);
    void auditLog({ userId: this.userId, table: this.table, op: 'server-delete', entityId: id });
  }

  async insertLocal(row: Omit<T, 'id'> & { id?: string }): Promise<StoredEntity<T>> {
    const db = await getDB(this.userId);
    const id = (row as any).id ?? crypto.randomUUID();
    const now = Date.now();
    // Server payload stays plaintext (RLS-protected).
    const serverPayload = { ...(row as any), id, user_id: this.userId };
    const sealed = await sealRow(this.userId, this.table, { ...(row as any), id });
    const stored: StoredEntity<T> = {
      ...(sealed as any),
      _syncStatus: 'pending',
      _localUpdatedAt: now,
    };
    await db.put(this.table, stored as any);
    await enqueue({
      table: this.table, op: 'insert', entityId: id,
      payload: serverPayload, userId: this.userId,
    });
    void auditLog({ userId: this.userId, table: this.table, op: 'insert', entityId: id, payload: serverPayload });
    return stored;
  }

  async updateLocal(id: string, patch: Partial<T>): Promise<StoredEntity<T> | undefined> {
    const db = await getDB(this.userId);
    const prev = (await db.get(this.table, id)) as StoredEntity<T> | undefined;
    if (!prev) return undefined;
    // Decrypt prev, apply patch, re-seal.
    const plainPrev = await openRow(this.userId, this.table, prev);
    const merged = { ...(plainPrev as any), ...patch, id };
    const sealed = await sealRow(this.userId, this.table, merged);
    const next: StoredEntity<T> = {
      ...(sealed as any),
      _syncStatus: 'pending',
      _localUpdatedAt: Date.now(),
    };
    await db.put(this.table, next as any);
    await enqueue({
      table: this.table, op: 'update', entityId: id, payload: patch, userId: this.userId,
    });
    void auditLog({ userId: this.userId, table: this.table, op: 'update', entityId: id, payload: patch });
    return next;
  }

  async deleteLocal(id: string): Promise<void> {
    const db = await getDB(this.userId);
    const prev = (await db.get(this.table, id)) as StoredEntity<T> | undefined;
    if (prev) {
      await db.put(this.table, { ...prev, _syncStatus: 'pending', _deletedAt: Date.now() } as any);
    }
    await enqueue({
      table: this.table, op: 'delete', entityId: id, payload: null, userId: this.userId,
    });
    void auditLog({ userId: this.userId, table: this.table, op: 'delete', entityId: id });
  }
}

export function repos(userId: string) {
  return {
    transactions: new Repository<any>('transactions', userId),
    accounts:     new Repository<any>('accounts', userId),
    budgets:      new Repository<any>('budgets', userId),
    goals:        new Repository<any>('goals', userId),
    subscriptions:new Repository<any>('subscriptions', userId),
    categories:   new Repository<any>('categories', userId),
  };
}
