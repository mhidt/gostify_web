import { openDB, type DBSchema, type IDBPDatabase } from "idb";

export interface StoredImage {
  name: string;
  buffer: ArrayBuffer;
  type: string;
}

interface GostifyImagesDb extends DBSchema {
  images: {
    key: string;
    value: StoredImage;
    indexes: {
      name: string;
    };
  };
}

const DB_NAME = "gostify-images";
const DB_VERSION = 1;
const STORE_NAME = "images";

let dbPromise: Promise<IDBPDatabase<GostifyImagesDb>> | null = null;

function getDb() {
  dbPromise ??= openDB<GostifyImagesDb>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "name" });
      }
    },
  });

  return dbPromise;
}

export const imageStore = {
  async put(name: string, buffer: ArrayBuffer, type: string): Promise<void> {
    const db = await getDb();
    await db.put(STORE_NAME, { name, buffer, type });
  },

  async get(name: string): Promise<{ buffer: ArrayBuffer; type: string } | null> {
    const db = await getDb();
    const entry = await db.get(STORE_NAME, name);
    if (!entry) return null;

    return { buffer: entry.buffer, type: entry.type };
  },

  async delete(name: string): Promise<void> {
    const db = await getDb();
    await db.delete(STORE_NAME, name);
  },

  async list(): Promise<{ name: string; type: string }[]> {
    const db = await getDb();
    const entries = await db.getAll(STORE_NAME);
    return entries.map(({ name, type }) => ({ name, type }));
  },

  async clear(): Promise<void> {
    const db = await getDb();
    await db.clear(STORE_NAME);
  },
};
