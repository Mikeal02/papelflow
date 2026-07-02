/**
 * Elite client data pipeline — IndexedDB store definitions.
 *
 * Single database per user (keyed by uid), versioned schema, typed stores,
 * secondary indexes for common query paths. All reads/writes flow through
 * repositories, never directly on this handle.
 */
import { openDB, type IDBPDatabase, type DBSchema } from 'idb';

export type SyncStatus = 'clean' | 'dirty' | 'pending' | 'error';

export interface EntityMeta {
  _syncStatus: SyncStatus;
  _localUpdatedAt: number;
  _serverUpdatedAt?: string | null;
  _deletedAt?: number | null;
}

export type StoredEntity<T> = T & EntityMeta;

export interface QueuedMutation {
  id: string;                       // uuid
  table: 'transactions' | 'accounts' | 'budgets' | 'goals' | 'subscriptions' | 'categories';
  op: 'insert' | 'update' | 'delete';
  entityId: string;                 // local or server id
  payload: any;
  createdAt: number;
  attempts: number;
  lastError?: string | null;
  nextAttemptAt: number;            // for exponential backoff
  userId: string;
}

export interface SyncCursor {
  table: string;
  lastSyncedAt: string;             // ISO from server
  lastFullReconcileAt: number;      // epoch ms
}

interface FinflowSchema extends DBSchema {
  transactions: {
    key: string;
    value: StoredEntity<any>;
    indexes: { 'by-date': string; 'by-account': string; 'by-category': string; 'by-sync': string };
  };
  accounts: { key: string; value: StoredEntity<any>; indexes: { 'by-type': string } };
  budgets: { key: string; value: StoredEntity<any>; indexes: { 'by-month': string } };
  goals: { key: string; value: StoredEntity<any>; indexes: { 'by-deadline': string } };
  subscriptions: { key: string; value: StoredEntity<any>; indexes: { 'by-next-due': string } };
  categories: { key: string; value: StoredEntity<any>; indexes: { 'by-type': string } };
  mutation_queue: {
    key: string;
    value: QueuedMutation;
    indexes: { 'by-next-attempt': number; 'by-table': string };
  };
  sync_cursors: { key: string; value: SyncCursor };
  aggregations: {
    key: string; // scope like `monthly:2026-07` or `dna:v1`
    value: { key: string; value: any; computedAt: number; version: number };
  };
}

const DB_VERSION = 1;
let dbPromise: Promise<IDBPDatabase<FinflowSchema>> | null = null;
let currentUserId: string | null = null;

function dbName(uid: string) {
  return `finflow:${uid}`;
}

export function getDB(userId: string): Promise<IDBPDatabase<FinflowSchema>> {
  if (dbPromise && currentUserId === userId) return dbPromise;
  if (dbPromise && currentUserId !== userId) {
    dbPromise.then(d => d.close()).catch(() => {});
    dbPromise = null;
  }
  currentUserId = userId;
  dbPromise = openDB<FinflowSchema>(dbName(userId), DB_VERSION, {
    upgrade(db) {
      const tx = db.createObjectStore('transactions', { keyPath: 'id' });
      tx.createIndex('by-date', 'date');
      tx.createIndex('by-account', 'account_id');
      tx.createIndex('by-category', 'category_id');
      tx.createIndex('by-sync', '_syncStatus');

      const acc = db.createObjectStore('accounts', { keyPath: 'id' });
      acc.createIndex('by-type', 'type');

      const bud = db.createObjectStore('budgets', { keyPath: 'id' });
      bud.createIndex('by-month', 'month');

      const goal = db.createObjectStore('goals', { keyPath: 'id' });
      goal.createIndex('by-deadline', 'deadline');

      const sub = db.createObjectStore('subscriptions', { keyPath: 'id' });
      sub.createIndex('by-next-due', 'next_due');

      const cat = db.createObjectStore('categories', { keyPath: 'id' });
      cat.createIndex('by-type', 'type');

      const q = db.createObjectStore('mutation_queue', { keyPath: 'id' });
      q.createIndex('by-next-attempt', 'nextAttemptAt');
      q.createIndex('by-table', 'table');

      db.createObjectStore('sync_cursors', { keyPath: 'table' });
      db.createObjectStore('aggregations', { keyPath: 'key' });
    },
  });
  return dbPromise;
}

export async function resetDB(userId: string) {
  const db = await getDB(userId);
  const stores = ['transactions','accounts','budgets','goals','subscriptions','categories','mutation_queue','sync_cursors','aggregations'] as const;
  const tx = db.transaction(stores, 'readwrite');
  await Promise.all(stores.map(s => tx.objectStore(s).clear()));
  await tx.done;
}

export type { FinflowSchema };
