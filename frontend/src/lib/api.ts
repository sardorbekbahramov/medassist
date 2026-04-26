const BASE_URL = "https://medassist-j8zx.onrender.com/api";
async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const tg = (window as any).Telegram?.WebApp;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options?.headers as Record<string, string>),
  };
  if (tg?.initData) {
    headers["X-Telegram-Init-Data"] = tg.initData;
  }

  // Dev fallback — telegram ID ni query param sifatida yuborish
  const tgId = tg?.initDataUnsafe?.user?.id;
  const separator = path.includes("?") ? "&" : "?";
  const fullPath = tgId ? `${path}${separator}tg_id=${tgId}` : path;

  const res = await fetch(`${BASE_URL}${fullPath}`, { ...options, headers });
  if (!res.ok) {
    throw new Error(`API error ${res.status}`);
  }
  return res.json();
}

export interface UserProfile {
  id: number;
  telegram_id: number;
  full_name: string;
  age: number;
  weight_kg: number;
  height_cm: number;
  gender: string;
  language: string;
  daily_water_goal_ml: number;
  daily_calories_goal: number;
}

export interface DailyStats {
  date: string;
  water_ml: number;
  calories_consumed: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
  text_analyses_count: number;
  vision_analyses_count: number;
}

export interface NearbyPlace {
  name: string;
  amenity: string;
  lat: number;
  lon: number;
  distance_m: number;
  phone?: string;
  opening_hours?: string;
  address?: string;
}

export const api = {
  getProfile: () => request<UserProfile>("/user/profile"),
  getWeeklyStats: () => request<DailyStats[]>("/user/analytics/week"),
  getNearby: (lat: number, lon: number) =>
    request<NearbyPlace[]>(`/location/nearby?lat=${lat}&lon=${lon}`),
};
