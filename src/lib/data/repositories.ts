/**
 * Typed repositories — cache-first read, write-through with offline queue.
 *
 * Each repository wraps one IDB store and mirrors a Supabase table. Reads
 * return local cache instantly; writes patch local state, enqueue a server
 * mutation, and mark the row _syncStatus='pending' until the sync engine
 * receives the authoritative row back.
 */
import { getDB, type StoredEntity } from './db';
import { enqueue } from './offlineQueue';

type Table = 'transactions' | 'accounts' | 'budgets' | 'goals' | 'subscriptions' | 'categories';

export class Repository<T extends { id: string }> {
  constructor(private readonly table: Table, private readonly userId: string) {}

  async list(filter?: (row: StoredEntity<T>) => boolean): Promise<StoredEntity<T>[]> {
    const db = await getDB(this.userId);
    const all = (await db.getAll(this.table)) as StoredEntity<T>[];
    const live = all.filter(r => !r._deletedAt);
    return filter ? live.filter(filter) : live;
  }

  async get(id: string): Promise<StoredEntity<T> | undefined> {
    const db = await getDB(this.userId);
    const row = (await db.get(this.table, id)) as StoredEntity<T> | undefined;
    if (!row || row._deletedAt) return undefined;
    return row;
  }

  async upsertFromServer(rows: T[] | T) {
    const db = await getDB(this.userId);
    const list = Array.isArray(rows) ? rows : [rows];
    const tx = db.transaction(this.table, 'readwrite');
    for (const r of list) {
      const prev = (await tx.store.get(r.id)) as StoredEntity<T> | undefined;
      const merged: StoredEntity<T> = {
        ...(r as any),
        _syncStatus: 'clean',
        _localUpdatedAt: prev?._localUpdatedAt ?? Date.now(),
        _serverUpdatedAt: (r as any).updated_at ?? new Date().toISOString(),
        _deletedAt: null,
      };
      await tx.store.put(merged as any);
    }
    await tx.done;
  }

  async removeFromServer(id: string) {
    const db = await getDB(this.userId);
    await db.delete(this.table, id);
  }

  async insertLocal(row: Omit<T, 'id'> & { id?: string }): Promise<StoredEntity<T>> {
    const db = await getDB(this.userId);
    const id = (row as any).id ?? crypto.randomUUID();
    const now = Date.now();
    const stored: StoredEntity<T> = {
      ...(row as any),
      id,
      _syncStatus: 'pending',
      _localUpdatedAt: now,
    };
    await db.put(this.table, stored as any);
    await enqueue({
      table: this.table, op: 'insert', entityId: id,
      payload: { ...(row as any), id, user_id: this.userId },
      userId: this.userId,
    });
    return stored;
  }

  async updateLocal(id: string, patch: Partial<T>): Promise<StoredEntity<T> | undefined> {
    const db = await getDB(this.userId);
    const prev = (await db.get(this.table, id)) as StoredEntity<T> | undefined;
    if (!prev) return undefined;
    const next: StoredEntity<T> = {
      ...prev, ...patch,
      _syncStatus: 'pending',
      _localUpdatedAt: Date.now(),
    };
    await db.put(this.table, next as any);
    await enqueue({
      table: this.table, op: 'update', entityId: id, payload: patch, userId: this.userId,
    });
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
