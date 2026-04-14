export type SBTIResult = {
  petKey: string;
  petName: string;      // e.g. '比格大魔王'
  petDesc: string;      // short description
  typeCode: string;     // e.g. 'EUOP'
  petLine: string;      // one-liner quote
  bodyText: string;     // full analysis text
  drivePercents: [number, number, number, number]; // 探索/控制/关怀/松弛
  dimE: number; dimI: number;
  dimU: number; dimD: number;
  dimO: number; dimX: number;
  savedAt: string;      // ISO timestamp
};

export type PetProfileRecord = {
  id: string;
  userId: string;
  name: string;
  age: string;
  ageUnit: string;
  gender: string;
  petType: string;
  breed: string;
  weight: string;
  length: string;
  frontPhoto?: Blob;
  sidePhoto?: Blob;
  frontPhotoName?: string;
  sidePhotoName?: string;
  avatarUrl?: string;
  createdAt: string;
  sbtiResult?: SBTIResult;
};

const DB_NAME = 'pet-health-db';
const DB_VERSION = 1;
const STORE_NAME = 'pet_profiles';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('userId', 'userId', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function savePetProfile(record: PetProfileRecord): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function getLatestPetProfileByUser(userId: string): Promise<PetProfileRecord | null> {
  const db = await openDb();
  const profiles = await new Promise<PetProfileRecord[]>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const index = tx.objectStore(STORE_NAME).index('userId');
    const request = index.getAll(userId);
    request.onsuccess = () => resolve(request.result as PetProfileRecord[]);
    request.onerror = () => reject(request.error);
  });
  db.close();

  if (!profiles.length) return null;
  return profiles.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
}

export async function getAllPetProfilesByUser(userId: string): Promise<PetProfileRecord[]> {
  const db = await openDb();
  const profiles = await new Promise<PetProfileRecord[]>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const index = tx.objectStore(STORE_NAME).index('userId');
    const request = index.getAll(userId);
    request.onsuccess = () => resolve(request.result as PetProfileRecord[]);
    request.onerror = () => reject(request.error);
  });
  db.close();

  return profiles.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getPetProfileById(petId: string): Promise<PetProfileRecord | null> {
  const db = await openDb();
  const record = await new Promise<PetProfileRecord | null>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).get(petId);
    request.onsuccess = () => resolve((request.result ?? null) as PetProfileRecord | null);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return record;
}

