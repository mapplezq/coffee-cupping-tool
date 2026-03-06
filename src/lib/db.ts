import { openDB, DBSchema } from 'idb';
import { SessionWithSamples, GlobalSample } from './types';

interface CuppingDB extends DBSchema {
  sessions: {
    key: string;
    value: SessionWithSamples;
    indexes: { 'by-date': string };
  };
  global_samples: {
    key: string;
    value: GlobalSample;
    indexes: { 'by-created': string };
  };
}

const DB_NAME = 'coffee-cupping-db';
const DB_VERSION = 2;

export async function initDB() {
  const db = await openDB<CuppingDB>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, newVersion, transaction) {
      if (oldVersion < 1) {
        const store = db.createObjectStore('sessions', {
          keyPath: 'id',
        });
        store.createIndex('by-date', 'cuppingDate');
      }
      if (oldVersion < 2) {
        const sampleStore = db.createObjectStore('global_samples', {
          keyPath: 'id',
        });
        sampleStore.createIndex('by-created', 'createdAt');
      }
    },
  });
  return db;
}

// Sessions
export async function saveSession(session: SessionWithSamples) {
  const db = await initDB();
  await db.put('sessions', session);
}

export async function getSession(id: string) {
  const db = await initDB();
  return db.get('sessions', id);
}

export async function getAllSessions() {
  const db = await initDB();
  return db.getAllFromIndex('sessions', 'by-date');
}

export async function deleteSession(id: string) {
  const db = await initDB();
  await db.delete('sessions', id);
}

// Global Samples
export async function saveGlobalSample(sample: GlobalSample) {
  const db = await initDB();
  await db.put('global_samples', sample);
}

export async function getGlobalSample(id: string) {
  const db = await initDB();
  return db.get('global_samples', id);
}

export async function getAllGlobalSamples() {
  const db = await initDB();
  return db.getAllFromIndex('global_samples', 'by-created');
}

export async function deleteGlobalSample(id: string) {
  const db = await initDB();
  await db.delete('global_samples', id);
}
