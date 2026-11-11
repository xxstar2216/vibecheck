import type { Project } from "./types";

const DB_NAME = "vibecheck";
const DB_VERSION = 1;
const PROJECTS = "projects";
const APP_DATA = "appData";

let dbPromise: Promise<IDBDatabase> | null = null;
let memoryOnly = false;
const memoryProjects = new Map<string, Project>();
const memoryAppData = new Map<string, unknown>();

function openDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB unavailable"));
  }
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(PROJECTS)) {
          db.createObjectStore(PROJECTS, { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains(APP_DATA)) {
          db.createObjectStore(APP_DATA, { keyPath: ["projectId", "key"] });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error ?? new Error("IndexedDB open failed"));
    });
  }
  return dbPromise;
}

function withStore<T>(
  name: string,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(name, mode);
        const req = fn(tx.objectStore(name));
        req.onsuccess = () => resolve(req.result as T);
        req.onerror = () => reject(req.error ?? new Error("IndexedDB request failed"));
      }),
  );
}

function sortProjects(list: Project[]): Project[] {
  return [...list].sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function listProjects(): Promise<Project[]> {
  if (!memoryOnly) {
    try {
      const all = await withStore<Project[]>(PROJECTS, "readonly", (s) => s.getAll());
      return sortProjects(all ?? []);
    } catch {
      memoryOnly = true;
    }
  }
  return sortProjects(Array.from(memoryProjects.values()));
}

export async function saveProject(project: Project): Promise<void> {
  if (!memoryOnly) {
    try {
      await withStore(PROJECTS, "readwrite", (s) => s.put(project));
      return;
    } catch {
      memoryOnly = true;
    }
  }
  memoryProjects.set(project.id, project);
}

async function deleteAppDataForProject(projectId: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve) => {
    const tx = db.transaction(APP_DATA, "readwrite");
    const store = tx.objectStore(APP_DATA);
    const req = store.openCursor();
    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor) {
        const value = cursor.value as { projectId?: string } | undefined;
        if (value?.projectId === projectId) cursor.delete();
        cursor.continue();
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
    tx.onabort = () => resolve();
  });
}

export async function deleteProject(id: string): Promise<void> {
  if (!memoryOnly) {
    try {
      await withStore(PROJECTS, "readwrite", (s) => s.delete(id));
      await deleteAppDataForProject(id);
    } catch {
      memoryOnly = true;
    }
  }
  memoryProjects.delete(id);
  const prefix = `${id}:`;
  for (const key of Array.from(memoryAppData.keys())) {
    if (key.startsWith(prefix)) memoryAppData.delete(key);
  }
}

export async function getAppValue(projectId: string, key: string): Promise<unknown> {
  if (!memoryOnly) {
    try {
      const row = await withStore<{ value: unknown } | undefined>(
        APP_DATA,
        "readonly",
        (s) => s.get([projectId, key]),
      );
      return row?.value ?? null;
    } catch {
      memoryOnly = true;
    }
  }
  return memoryAppData.get(`${projectId}:${key}`) ?? null;
}

export async function setAppValue(projectId: string, key: string, value: unknown): Promise<void> {
  if (!memoryOnly) {
    try {
      await withStore(APP_DATA, "readwrite", (s) => s.put({ projectId, key, value }));
      return;
    } catch {
      memoryOnly = true;
    }
  }
  memoryAppData.set(`${projectId}:${key}`, value);
}

export async function removeAppValue(projectId: string, key: string): Promise<void> {
  if (!memoryOnly) {
    try {
      await withStore(APP_DATA, "readwrite", (s) => s.delete([projectId, key]));
    } catch {
      memoryOnly = true;
    }
  }
  memoryAppData.delete(`${projectId}:${key}`);
}
