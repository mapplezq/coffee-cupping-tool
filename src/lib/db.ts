import { openDB, DBSchema } from 'idb';
import { SessionWithSamples } from './types';

interface CuppingDB extends DBSchema {
  sessions: {
    key: string;
    value: SessionWithSamples;
    indexes: { 'by-date': string };
  };
}

const DB_NAME = 'coffee-cupping-db';
const DB_VERSION = 1;

export async function initDB() {
  const db = await openDB<CuppingDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      const store = db.createObjectStore('sessions', {
        keyPath: 'id',
      });
      store.createIndex('by-date', 'cuppingDate');
    },
  });
  return db;
}

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
