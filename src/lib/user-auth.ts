import { getCloudflareContext } from "@opennextjs/cloudflare";

export interface UserProfile {
  id: string;
  name: string;
  email?: string;
  handle: string;
  favoriteTeam: string;
  badge?: string;
  quinielaPoints?: number;
  createdAt: number;
}

interface StoredUserAccount {
  profile: UserProfile;
  passwordHash?: string;
}

interface KVNamespaceLike {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

const memoryKv = new Map<string, string>();

async function getKvStore(): Promise<KVNamespaceLike> {
  try {
    const ctx = await getCloudflareContext({ async: true });
    const env = ctx?.env as Record<string, any> | undefined;
    if (env?.ENJUEGO_KV && typeof env.ENJUEGO_KV.get === "function") {
      return env.ENJUEGO_KV as KVNamespaceLike;
    }
  } catch {
    // Fallback in local Node dev mode
  }

  return {
    async get(key: string) {
      return memoryKv.get(key) ?? null;
    },
    async put(key: string, value: string) {
      memoryKv.set(key, value);
    },
  };
}

async function hashPassword(password: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(`enjuego_salt_2026_${password}`);
  const hashBuf = await crypto.subtle.digest("SHA-256", data);
  const hashArr = Array.from(new Uint8Array(hashBuf));
  return hashArr.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function generateFanHandle(name: string): string {
  const clean = name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 16);
  return `@${clean || "fan_lvbp"}`;
}

export async function quickFanLogin(
  name: string,
  favoriteTeam: string
): Promise<{ user: UserProfile; token: string }> {
  const kv = await getKvStore();
  const cleanName = name.trim().slice(0, 32) || "Fanático LVBP";
  const id = `fan_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const handle = generateFanHandle(cleanName);

  const profile: UserProfile = {
    id,
    name: cleanName,
    handle,
    favoriteTeam: favoriteTeam.trim().toUpperCase() || "CAR",
    badge: "Fan Oficial LVBP",
    quinielaPoints: 0,
    createdAt: Date.now(),
  };

  const account: StoredUserAccount = { profile };
  await kv.put(`auth:user:${id}`, JSON.stringify(account), { expirationTtl: 86400 * 365 });

  return {
    user: profile,
    token: `tok_${id}_${Date.now()}`,
  };
}

export async function registerUser(
  name: string,
  email: string,
  password: string,
  favoriteTeam: string
): Promise<{ user: UserProfile; token: string }> {
  const kv = await getKvStore();
  const cleanEmail = email.trim().toLowerCase();

  if (!cleanEmail || !cleanEmail.includes("@")) {
    throw new Error("Por favor ingresa un correo electrónico válido.");
  }
  if (!password || password.length < 6) {
    throw new Error("La contraseña debe tener al menos 6 caracteres.");
  }

  // Check if email already registered
  const existingUserId = await kv.get(`auth:email:${cleanEmail}`);
  if (existingUserId) {
    throw new Error("Este correo electrónico ya está registrado. Por favor inicia sesión.");
  }

  const cleanName = name.trim().slice(0, 32) || "Fanático LVBP";
  const id = `usr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const passwordHash = await hashPassword(password);
  const handle = generateFanHandle(cleanName);

  const profile: UserProfile = {
    id,
    name: cleanName,
    email: cleanEmail,
    handle,
    favoriteTeam: favoriteTeam.trim().toUpperCase() || "CAR",
    badge: "Fan Oficial LVBP",
    quinielaPoints: 0,
    createdAt: Date.now(),
  };

  const account: StoredUserAccount = { profile, passwordHash };
  await kv.put(`auth:user:${id}`, JSON.stringify(account), { expirationTtl: 86400 * 365 });
  await kv.put(`auth:email:${cleanEmail}`, id, { expirationTtl: 86400 * 365 });

  return {
    user: profile,
    token: `tok_${id}_${Date.now()}`,
  };
}

export async function loginUser(
  email: string,
  password: string
): Promise<{ user: UserProfile; token: string }> {
  const kv = await getKvStore();
  const cleanEmail = email.trim().toLowerCase();

  const userId = await kv.get(`auth:email:${cleanEmail}`);
  if (!userId) {
    throw new Error("No existe una cuenta con este correo. Puedes crear una gratis.");
  }

  const rawUser = await kv.get(`auth:user:${userId}`);
  if (!rawUser) {
    throw new Error("Usuario no encontrado.");
  }

  const account: StoredUserAccount = JSON.parse(rawUser);
  const hash = await hashPassword(password);

  if (account.passwordHash && account.passwordHash !== hash) {
    throw new Error("Contraseña incorrecta. Por favor verifica e intenta de nuevo.");
  }

  return {
    user: account.profile,
    token: `tok_${account.profile.id}_${Date.now()}`,
  };
}

export async function getUserById(id: string): Promise<UserProfile | null> {
  const kv = await getKvStore();
  const raw = await kv.get(`auth:user:${id}`);
  if (!raw) return null;
  try {
    const account: StoredUserAccount = JSON.parse(raw);
    return account.profile;
  } catch {
    return null;
  }
}

export async function updateUserProfile(
  id: string,
  updates: Partial<UserProfile>
): Promise<UserProfile> {
  const kv = await getKvStore();
  const raw = await kv.get(`auth:user:${id}`);
  if (!raw) {
    throw new Error("Usuario no encontrado");
  }

  const account: StoredUserAccount = JSON.parse(raw);
  const updatedProfile: UserProfile = {
    ...account.profile,
    ...updates,
    id: account.profile.id, // Immutable
    createdAt: account.profile.createdAt, // Immutable
  };

  account.profile = updatedProfile;
  await kv.put(`auth:user:${id}`, JSON.stringify(account), { expirationTtl: 86400 * 365 });

  return updatedProfile;
}
