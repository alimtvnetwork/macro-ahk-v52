import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'marco-workspace-db';
const STORE_NAME = 'states';
const DB_VERSION = 1;

/**
 * IndexedDB backed storage for high-frequency or large state updates.
 */
export class WorkspaceStorage {
    private static db: Promise<IDBPDatabase> | null = null;

    private static getDB() {
        if (!this.db) {
            this.db = openDB(DB_NAME, DB_VERSION, {
                upgrade(db: IDBPDatabase) {
                    if (!db.objectStoreNames.contains(STORE_NAME)) {
                        db.createObjectStore(STORE_NAME);
                    }
                },
            });
        }
        return this.db;
    }


    static async set(key: string, value: unknown): Promise<void> {
        const db = await this.getDB();
        await db.put(STORE_NAME, value, key);
    }

    static async get<T>(key: string): Promise<T | undefined> {
        const db = await this.getDB();
        return db.get(STORE_NAME, key);
    }

    static async delete(key: string): Promise<void> {
        const db = await this.getDB();
        await db.delete(STORE_NAME, key);
    }
}
