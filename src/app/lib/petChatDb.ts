export type ChatMessage = {
  id: string;
  userId: string;
  petId: string;
  role: 'user' | 'doctor';
  text: string;
  image?: Blob;
  imageName?: string;
  createdAt: string;
};

const DB_NAME = 'pet-health-chat-db';
const DB_VERSION = 1;
const STORE_NAME = 'pet_chat_messages';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('userId', 'userId', { unique: false });
        store.createIndex('petId', 'petId', { unique: false });
        store.createIndex('userId_petId', ['userId', 'petId'] as any, { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveChatMessage(msg: ChatMessage): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(msg);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function getChatMessagesByUserPet(userId: string, petId: string): Promise<ChatMessage[]> {
  const db = await openDb();
  const messages = await new Promise<ChatMessage[]>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('userId_petId');
    // Note: indexedDB 复合索引这里使用极简写法（TS 里需要 as any），运行时会按 value 匹配。
    const request = index.getAll([userId, petId] as any);
    request.onsuccess = () => resolve(request.result as ChatMessage[]);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return messages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

