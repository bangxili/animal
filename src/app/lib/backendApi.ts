import type { PetProfileRecord } from './petProfileDb';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

// ── 注册 / 登录 ───────────────────────────────────────────────

export interface AuthResult {
  user_id: string;
  username: string;
  has_pets: boolean;
}

export async function apiRegister(username: string, password: string): Promise<AuthResult> {
  const res = await fetch(`${API_BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `注册失败 (${res.status})`);
  }
  return res.json() as Promise<AuthResult>;
}

export async function apiLogin(username: string, password: string): Promise<AuthResult> {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `登录失败 (${res.status})`);
  }
  return res.json() as Promise<AuthResult>;
}

/** 获取后端数字 pet_id，优先读缓存，没有则从后端拉取并缓存 */
export async function getBackendPetId(): Promise<string> {
  const cached = localStorage.getItem('current-backend-pet-id');
  if (cached) return cached;
  const userId = localStorage.getItem('current-user-id') || 'demo-user';
  const res = await fetch(`${API_BASE}/api/pets?user_id=${encodeURIComponent(userId)}`);
  if (!res.ok) return '';
  const list = (await res.json()) as { id: number }[];
  if (!list[0]) return '';
  const id = String(list[0].id);
  localStorage.setItem('current-backend-pet-id', id);
  return id;
}

type ApiPet = {
  id: number;
  user_id: string;
  name: string;
  age: number | null;
  age_unit: string | null;
  gender: string | null;
  pet_type: string | null;
  breed: string | null;
  weight: number | null;
  length: number | null;
  front_photo_path: string | null;
  side_photo_path: string | null;
  avatar_url: string | null;
  created_at: string;
};

type ApiMessage = {
  id: number;
  role: string;
  content: string;
  created_at: string;
};

type ApiToiletRecord = {
  id: number;
  user_id: string;
  pet_id: number;
  type: string;
  image_path: string;
  analysis_result: {
    status: string;
    description?: string;
    scores: Record<string, number>;
    suggestion: string;
  } | null;
  created_at: string;
};

type ApiDailyRecipe = {
  id: number;
  user_id: string;
  pet_id: number;
  date: string;
  meals: Array<{
    time: string;
    time_icon: string;
    time_tag: string;
    dishes: Array<{
      name: string;
      amount: string;
      emoji: string;
      benefit: string;
    }>;
    calories: number;
  }>;
  nutrition_summary: {
    protein: { current: number; target: number };
    fat: { current: number; target: number };
    carbs: { current: number; target: number };
    water: { current: number; target: number };
  } | null;
  tips: string | null;
  created_at: string;
};

function mapApiPetToRecord(p: ApiPet): PetProfileRecord {
  return {
    id: String(p.id),
    userId: p.user_id,
    name: p.name,
    age: p.age != null ? String(p.age) : '',
    ageUnit: p.age_unit || '',
    gender: p.gender || '',
    petType: p.pet_type || '',
    breed: p.breed || '',
    weight: p.weight != null ? String(p.weight) : '',
    length: p.length != null ? String(p.length) : '',
    avatarUrl: p.avatar_url ? (p.avatar_url.startsWith('http') ? p.avatar_url : `${API_BASE}${p.avatar_url}`) : undefined,
    createdAt: p.created_at,
  };
}

export async function apiListPetsByUser(userId: string): Promise<PetProfileRecord[]> {
  const res = await fetch(`${API_BASE}/api/pets?user_id=${encodeURIComponent(userId)}`);
  if (!res.ok) throw new Error('load pets failed');
  const data = (await res.json()) as ApiPet[];
  return data.map(mapApiPetToRecord);
}

export async function apiCreatePetProfile(input: {
  userId: string;
  name: string;
  age?: number;
  ageUnit?: string;
  gender?: string;
  petType?: string;
  breed?: string;
  weight?: number;
  length?: number;
}): Promise<PetProfileRecord> {
  const res = await fetch(`${API_BASE}/api/pets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: input.userId,
      name: input.name,
      age: input.age,
      age_unit: input.ageUnit,
      gender: input.gender,
      pet_type: input.petType,
      breed: input.breed,
      weight: input.weight,
      length: input.length,
    }),
  });
  if (!res.ok) throw new Error('create pet failed');
  return mapApiPetToRecord((await res.json()) as ApiPet);
}

export async function apiUploadPetPhotos(petId: string, front?: File | null, side?: File | null): Promise<PetProfileRecord | null> {
  if (!front && !side) return null;
  const form = new FormData();
  if (front) form.append('front_photo', front);
  if (side) form.append('side_photo', side);
  const res = await fetch(`${API_BASE}/api/pets/${petId}/photos`, { method: 'POST', body: form });
  if (!res.ok) throw new Error('upload photos failed');
  const data = (await res.json()) as ApiPet;
  return mapApiPetToRecord(data);
}

export async function apiDeletePet(petId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/pets/${petId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('delete pet failed');
}

export async function apiGetConsultationHistory(userId: string, petId: string): Promise<ApiMessage[]> {
  const res = await fetch(
    `${API_BASE}/api/consultations/history?user_id=${encodeURIComponent(userId)}&pet_id=${encodeURIComponent(petId)}`,
  );
  if (!res.ok) throw new Error('history failed');
  return (await res.json()) as ApiMessage[];
}

export async function apiAskConsultation(input: {
  userId: string;
  petId: string;
  question: string;
  image?: File | null;
}): Promise<{ answer: string }> {
  const form = new FormData();
  form.append('user_id', input.userId);
  form.append('pet_id', input.petId);
  form.append('question', input.question);
  if (input.image) form.append('image', input.image);
  const res = await fetch(`${API_BASE}/api/consultations/ask`, {
    method: 'POST',
    body: form,
  });
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try { const body = await res.json(); detail = body.detail || detail; } catch { /* ignore */ }
    throw new Error(detail);
  }
  return (await res.json()) as { answer: string };
}

// 每日大小便API
export async function apiAnalyzeToilet(input: {
  userId: string;
  petId: string;
  poopImage?: File | null;
  peeImage?: File | null;
}): Promise<{
  record_id: number;
  status: string;
  scores: Record<string, number>;
  suggestion: string;
}> {
  const form = new FormData();
  form.append('user_id', input.userId);
  form.append('pet_id', input.petId);
  if (input.poopImage) form.append('poop_image', input.poopImage);
  if (input.peeImage) form.append('pee_image', input.peeImage);

  const res = await fetch(`${API_BASE}/api/toilet/analyze`, {
    method: 'POST',
    body: form,
  });
  if (!res.ok) throw new Error('toilet analyze failed');
  return await res.json();
}

export async function apiGetToiletHistory(userId: string, petId: string): Promise<ApiToiletRecord[]> {
  const res = await fetch(
    `${API_BASE}/api/toilet/history?user_id=${encodeURIComponent(userId)}&pet_id=${encodeURIComponent(petId)}`,
  );
  if (!res.ok) throw new Error('toilet history failed');
  return (await res.json()) as ApiToiletRecord[];
}

// 每日食谱API
export async function apiGenerateRecipe(userId: string, petId: string): Promise<ApiDailyRecipe> {
  const res = await fetch(
    `${API_BASE}/api/recipes/generate?user_id=${encodeURIComponent(userId)}&pet_id=${encodeURIComponent(petId)}`,
    {
      method: 'POST',
    },
  );
  if (!res.ok) throw new Error('generate recipe failed');
  return (await res.json()) as ApiDailyRecipe;
}

export async function apiGetTodayRecipe(userId: string, petId: string): Promise<ApiDailyRecipe | null> {
  const res = await fetch(
    `${API_BASE}/api/recipes/today?user_id=${encodeURIComponent(userId)}&pet_id=${encodeURIComponent(petId)}`,
  );
  if (!res.ok) throw new Error('get recipe failed');
  const data = await res.json();
  return data || null;
}

export async function apiGetRecipeHistory(userId: string, petId: string): Promise<ApiDailyRecipe[]> {
  const res = await fetch(
    `${API_BASE}/api/recipes/history?user_id=${encodeURIComponent(userId)}&pet_id=${encodeURIComponent(petId)}`,
  );
  if (!res.ok) throw new Error('recipe history failed');
  return (await res.json()) as ApiDailyRecipe[];
}

// 实际饮食记录API
export interface MealLogItem {
  name: string;
  amount: string;
  emoji: string;
}

export interface ApiMealLog {
  id: number;
  user_id: string;
  pet_id: number;
  date: string;
  meal_type: string;
  items: MealLogItem[];
  created_at: string;
}

export async function apiAddMealLog(input: {
  userId: string;
  petId: string;
  mealType: string;
  items: MealLogItem[];
}): Promise<ApiMealLog> {
  const res = await fetch(`${API_BASE}/api/recipes/meal-log`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: input.userId,
      pet_id: input.petId,
      meal_type: input.mealType,
      items: input.items,
    }),
  });
  if (!res.ok) throw new Error('add meal log failed');
  return await res.json();
}

export async function apiGetTodayMealLogs(userId: string, petId: string): Promise<ApiMealLog[]> {
  const res = await fetch(
    `${API_BASE}/api/recipes/meal-log/today?user_id=${encodeURIComponent(userId)}&pet_id=${encodeURIComponent(petId)}`,
  );
  if (!res.ok) throw new Error('get meal logs failed');
  return (await res.json()) as ApiMealLog[];
}

export async function apiDeleteMealLog(logId: number): Promise<void> {
  const res = await fetch(`${API_BASE}/api/recipes/meal-log/${logId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('delete meal log failed');
}

export interface MealComparisonResult {
  actual_nutrition: {
    protein: { current: number; target: number };
    fat: { current: number; target: number };
    carbs: { current: number; target: number };
    water: { current: number; target: number };
    calories: { current: number; target: number };
  };
  comparison: Array<{ item: string; status: string; detail: string }>;
  score: number;
  summary: string;
  suggestions: string[];
}

export async function apiAnalyzeMealComparison(userId: string, petId: string): Promise<MealComparisonResult> {
  const res = await fetch(
    `${API_BASE}/api/recipes/meal-log/analyze?user_id=${encodeURIComponent(userId)}&pet_id=${encodeURIComponent(petId)}`,
    { method: 'POST' },
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'analyze failed');
  }
  return await res.json();
}

export interface MealDayHistory {
  date: string;
  meals: Array<{
    id: number;
    meal_type: string;
    items: MealLogItem[];
  }>;
  score: number | null;
  analysis_result: MealComparisonResult | null;
}

export async function apiGetMealLogHistory(userId: string, petId: string, days: number = 30): Promise<MealDayHistory[]> {
  const res = await fetch(
    `${API_BASE}/api/recipes/meal-log/history?user_id=${encodeURIComponent(userId)}&pet_id=${encodeURIComponent(petId)}&days=${days}`,
  );
  if (!res.ok) throw new Error('get meal history failed');
  return (await res.json()) as MealDayHistory[];
}

// 健康分析API
export async function apiAnalyzeHealth(input: {
  userId: string;
  petId: string;
  healthType: 'weight' | 'fat' | 'stomach' | 'heart' | 'bone';
}): Promise<{ value: string; suggestion: string }> {
  const res = await fetch(
    `${API_BASE}/api/health/analyze?user_id=${encodeURIComponent(input.userId)}&pet_id=${encodeURIComponent(input.petId)}&health_type=${input.healthType}`,
  );
  if (!res.ok) throw new Error('health analyze failed');
  return (await res.json()) as { value: string; suggestion: string };
}

export async function apiGetHealthSummary(userId: string, petId: string): Promise<any> {
  const res = await fetch(
    `${API_BASE}/api/health/summary?user_id=${encodeURIComponent(userId)}&pet_id=${encodeURIComponent(petId)}`,
  );
  if (!res.ok) throw new Error('health summary failed');
  return await res.json();
}

export async function apiAnalyzePetPhoto(
  userId: string,
  petId: string,
  analysisType: 'fur' | 'mood',
): Promise<{ score: number | null; detail: string; suggestion: string; mood?: string; no_photo?: boolean }> {
  const res = await fetch(
    `${API_BASE}/api/health/photo-analysis?user_id=${encodeURIComponent(userId)}&pet_id=${encodeURIComponent(petId)}&analysis_type=${analysisType}`,
  );
  if (!res.ok) throw new Error('photo analysis failed');
  return await res.json();
}

// 基因检测API
export async function apiAnalyzeGene(input: {
  userId: string;
  petId: string;
  image: File;
}): Promise<{
  record_id: number;
  breeds: Array<{ breed: string; percent: number; emoji: string; color: string }>;
  conclusion: string;
  traits: Array<{ name: string; value: string }>;
}> {
  const form = new FormData();
  form.append('user_id', input.userId);
  form.append('pet_id', input.petId);
  form.append('image', input.image);

  const res = await fetch(`${API_BASE}/api/gene/analyze`, {
    method: 'POST',
    body: form,
  });
  if (!res.ok) throw new Error('gene analyze failed');
  return await res.json();
}

export interface ApiGeneRecord {
  id: number;
  user_id: string;
  pet_id: number;
  image_path: string | null;
  analysis_result: {
    breeds: Array<{ breed: string; percent: number; emoji: string; color: string }>;
    conclusion: string;
    traits: Array<{ name: string; value: string }>;
  } | null;
  created_at: string;
}

export async function apiGetGeneHistory(userId: string, petId: string): Promise<ApiGeneRecord[]> {
  const res = await fetch(
    `${API_BASE}/api/gene/history?user_id=${encodeURIComponent(userId)}&pet_id=${encodeURIComponent(petId)}`,
  );
  if (!res.ok) throw new Error('gene history failed');
  return (await res.json()) as ApiGeneRecord[];
}

// 体重记录API
export async function apiUpdatePetProfile(petId: string, data: {
  name?: string;
  age?: number;
  age_unit?: string;
  gender?: string;
  pet_type?: string;
  breed?: string;
  weight?: number;
  length?: number;
}): Promise<PetProfileRecord> {
  const res = await fetch(`${API_BASE}/api/pets/${petId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('update pet failed');
  return mapApiPetToRecord((await res.json()) as ApiPet);
}

export async function apiAddWeightRecord(input: {
  userId: string;
  petId: string;
  weight: number;
  note?: string;
  recordedAt?: string; // "YYYY-MM-DD", 支持补录
}): Promise<{
  id: number;
  weight: number;
  recorded_at: string;
}> {
  const res = await fetch(`${API_BASE}/api/health/weight`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: input.userId,
      pet_id: input.petId,
      weight: input.weight,
      note: input.note,
      recorded_at: input.recordedAt,
    }),
  });
  if (!res.ok) throw new Error('add weight failed');
  return await res.json();
}

export async function apiGetWeightHistory(
  userId: string,
  petId: string,
  days: number = 30
): Promise<Array<{
  id: number;
  weight: number;
  recorded_at: string;
}>> {
  const res = await fetch(
    `${API_BASE}/api/health/weight/history?user_id=${encodeURIComponent(userId)}&pet_id=${encodeURIComponent(petId)}&days=${days}`,
  );
  if (!res.ok) throw new Error('get weight history failed');
  return await res.json();
}

export async function apiGetPetPhotoUrls(petId: string): Promise<{ frontPhotoUrl: string | null; sidePhotoUrl: string | null }> {
  const res = await fetch(`${API_BASE}/api/pets/${petId}`);
  if (!res.ok) throw new Error('get pet failed');
  const data = (await res.json()) as ApiPet;
  const toUrl = (p: string | null) => {
    if (!p) return null;
    return p.startsWith('http') ? p : `${API_BASE}/${p.replace(/^\//, '')}`;
  };
  return {
    frontPhotoUrl: toUrl(data.front_photo_path),
    sidePhotoUrl: toUrl(data.side_photo_path),
  };
}

// 宠物社交主页 API
export interface ApiSocialProfile {
  id: number;
  user_id: string;
  pet_id: number;
  bio: string | null;
  tags: string[] | null;
  photo_paths: string[] | null;
  created_at: string;
  updated_at: string;
}

export async function apiGetSocialProfile(userId: string, petId: string): Promise<ApiSocialProfile> {
  const res = await fetch(
    `${API_BASE}/api/match/profile?user_id=${encodeURIComponent(userId)}&pet_id=${encodeURIComponent(petId)}`,
  );
  if (!res.ok) throw new Error('get social profile failed');
  return await res.json();
}

export async function apiSaveSocialProfile(
  userId: string,
  petId: string,
  data: { bio?: string; tags?: string[] },
): Promise<ApiSocialProfile> {
  const res = await fetch(
    `${API_BASE}/api/match/profile?user_id=${encodeURIComponent(userId)}&pet_id=${encodeURIComponent(petId)}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    },
  );
  if (!res.ok) throw new Error('save social profile failed');
  return await res.json();
}

export async function apiUploadSocialPhoto(userId: string, petId: string, photo: File): Promise<ApiSocialProfile> {
  const form = new FormData();
  form.append('photo', photo);
  const res = await fetch(
    `${API_BASE}/api/match/profile/photos?user_id=${encodeURIComponent(userId)}&pet_id=${encodeURIComponent(petId)}`,
    { method: 'POST', body: form },
  );
  if (!res.ok) throw new Error('upload social photo failed');
  return await res.json();
}

export async function apiDeleteSocialPhoto(userId: string, petId: string, photoIndex: number): Promise<ApiSocialProfile> {
  const res = await fetch(
    `${API_BASE}/api/match/profile/photos/${photoIndex}?user_id=${encodeURIComponent(userId)}&pet_id=${encodeURIComponent(petId)}`,
    { method: 'DELETE' },
  );
  if (!res.ok) throw new Error('delete social photo failed');
  return await res.json();
}
