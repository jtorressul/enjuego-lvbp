import { getCloudflareContext } from "@opennextjs/cloudflare";

export interface GameVoteState {
  awayVotes: number;
  homeVotes: number;
}

export interface ChatMessageItem {
  id: string;
  user: string;
  team: string;
  text: string;
  time: string;
  createdAt?: number;
}

export interface CommunityPostItem {
  id: string;
  user: string;
  handle: string;
  team: string;
  time: string;
  text: string;
  tag: string;
  likes: number;
  fires: number;
  claps: number;
  createdAt?: number;
}

interface KVNamespaceLike {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

// Local fallback memory store for `npm run dev` when outside workerd
const memoryKv = new Map<string, string>();

async function getKvStore(): Promise<KVNamespaceLike> {
  try {
    const ctx = await getCloudflareContext({ async: true });
    const env = ctx?.env as Record<string, any> | undefined;
    if (env?.ENJUEGO_KV && typeof env.ENJUEGO_KV.get === "function") {
      return env.ENJUEGO_KV as KVNamespaceLike;
    }
  } catch {
    // Fallback to in-memory store when running in standard Node dev mode
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

function getVenezuelaTimeString(): string {
  try {
    return new Date().toLocaleTimeString("es-VE", {
      timeZone: "America/Caracas",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
}

export function getSeedVotes(gameId: string): GameVoteState {
  const hash = String(gameId)
    .split("")
    .reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return {
    awayVotes: 140 + (hash % 95),
    homeVotes: 165 + ((hash * 7) % 110),
  };
}

export function getSeedChat(awayAbbr: string, homeAbbr: string): ChatMessageItem[] {
  return [
    {
      id: "seed-1",
      user: "Carlos_Caraquista",
      team: awayAbbr,
      text: `¡Hoy ganamos sí o sí! Vamos ${awayAbbr} con todo desde el primer inning 🔥⚾`,
      time: "hace 4m",
      createdAt: Date.now() - 240000,
    },
    {
      id: "seed-2",
      user: "LuisBeisbolVE",
      team: homeAbbr,
      text: `El bullpen de ${homeAbbr} viene intratable esta semana, ¡duelo de pitcheo!`,
      time: "hace 2m",
      createdAt: Date.now() - 120000,
    },
    {
      id: "seed-3",
      user: "BeisboleroLVBP",
      team: awayAbbr,
      text: "Excelente transmisión y el Gameday 2D se ve brutal 👏🇻🇪",
      time: "hace 1m",
      createdAt: Date.now() - 60000,
    },
  ];
}

export const SEED_COMMUNITY_POSTS: CommunityPostItem[] = [
  {
    id: "p1",
    user: "Carlos Caraquista",
    handle: "@carlos_lvbp",
    team: "CAR",
    time: "hace 5m",
    text: "¡Qué nivel de pitcheo estamos viendo en este arranque de temporada! El Monumental va a reventar en el próximo clásico 🔥🦁",
    tag: "#CaraquistaSoy",
    likes: 34,
    fires: 21,
    claps: 9,
    createdAt: Date.now() - 300000,
  },
  {
    id: "p2",
    user: "Navegante Turco",
    handle: "@magallanes_ve",
    team: "MAG",
    time: "hace 14m",
    text: "La ofensiva eléctrica respondiendo con corredores en posición anotadora. ¡Este año nadie nos baja del barco! ⚓⚡",
    tag: "#VamosMagallanes",
    likes: 41,
    fires: 28,
    claps: 14,
    createdAt: Date.now() - 840000,
  },
  {
    id: "p3",
    user: "Guaro Cardenal",
    handle: "@lara_beisbol",
    team: "LAR",
    time: "hace 28m",
    text: "El Antonio Herrera Gutiérrez siempre respeta la casa. La rotación abridora de Cardenales luce demasiado sólida este octubre 🐦💪",
    tag: "#SomosGuaritos",
    likes: 27,
    fires: 15,
    claps: 19,
    createdAt: Date.now() - 1680000,
  },
  {
    id: "p4",
    user: "Samba La Guaira",
    handle: "@paencima_tiburones",
    team: "LAG",
    time: "hace 42m",
    text: "¡Pa' encima siempre! Qué sabroso se vive la pelota invernal venezolana siguiendo cada pitcheo en vivo 🦈🥁",
    tag: "#PaEncima",
    likes: 52,
    fires: 39,
    claps: 24,
    createdAt: Date.now() - 2520000,
  },
];

export async function getGameInteractiveState(
  gameId: string,
  awayAbbr: string,
  homeAbbr: string,
  sessionId?: string
) {
  const kv = await getKvStore();
  const cleanId = String(gameId).replace(/[^a-zA-Z0-9_-]/g, "");

  // 1. Votes
  const rawVotes = await kv.get(`votes:${cleanId}`);
  let votes: GameVoteState;
  if (rawVotes) {
    try {
      votes = JSON.parse(rawVotes);
    } catch {
      votes = getSeedVotes(cleanId);
    }
  } else {
    votes = getSeedVotes(cleanId);
  }

  // 2. Chat
  const rawChat = await kv.get(`chat:${cleanId}`);
  let chat: ChatMessageItem[];
  if (rawChat) {
    try {
      chat = JSON.parse(rawChat);
    } catch {
      chat = getSeedChat(awayAbbr, homeAbbr);
    }
  } else {
    chat = getSeedChat(awayAbbr, homeAbbr);
  }

  // 3. Presence
  const rawPresence = await kv.get(`presence:${cleanId}`);
  const now = Date.now();
  let presenceMap: Record<string, number> = {};
  if (rawPresence) {
    try {
      presenceMap = JSON.parse(rawPresence);
    } catch {
      presenceMap = {};
    }
  }
  // Prune stale sessions (> 90 seconds)
  for (const [sid, ts] of Object.entries(presenceMap)) {
    if (now - ts > 90000) {
      delete presenceMap[sid];
    }
  }
  if (sessionId) {
    presenceMap[sessionId] = now;
    await kv.put(`presence:${cleanId}`, JSON.stringify(presenceMap), { expirationTtl: 3600 });
  }
  const activeRealSessions = Object.keys(presenceMap).length;
  const baseViewers = 180 + (cleanId.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 140);
  const viewers = baseViewers + activeRealSessions;

  return {
    votes,
    chat,
    viewers,
    activeRealSessions,
  };
}

export async function castGameVote(
  gameId: string,
  side: "away" | "home"
): Promise<GameVoteState> {
  const kv = await getKvStore();
  const cleanId = String(gameId).replace(/[^a-zA-Z0-9_-]/g, "");
  const rawVotes = await kv.get(`votes:${cleanId}`);
  let votes: GameVoteState = rawVotes ? JSON.parse(rawVotes) : getSeedVotes(cleanId);

  if (side === "away") {
    votes.awayVotes += 1;
  } else {
    votes.homeVotes += 1;
  }

  await kv.put(`votes:${cleanId}`, JSON.stringify(votes), { expirationTtl: 86400 * 30 });
  return votes;
}

export async function appendGameChat(
  gameId: string,
  awayAbbr: string,
  homeAbbr: string,
  user: string,
  team: string,
  text: string
): Promise<ChatMessageItem[]> {
  const kv = await getKvStore();
  const cleanId = String(gameId).replace(/[^a-zA-Z0-9_-]/g, "");
  const rawChat = await kv.get(`chat:${cleanId}`);
  let chat: ChatMessageItem[] = rawChat
    ? JSON.parse(rawChat)
    : getSeedChat(awayAbbr, homeAbbr);

  const newMsg: ChatMessageItem = {
    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    user: user.trim().slice(0, 28) || "AficionadoLVBP",
    team: team.trim().slice(0, 5) || awayAbbr,
    text: text.trim().slice(0, 240),
    time: getVenezuelaTimeString(),
    createdAt: Date.now(),
  };

  chat = [...chat.slice(-49), newMsg];
  await kv.put(`chat:${cleanId}`, JSON.stringify(chat), { expirationTtl: 86400 * 14 });
  return chat;
}

export async function getCommunityFeed(): Promise<CommunityPostItem[]> {
  const kv = await getKvStore();
  const raw = await kv.get("community:posts:v1");
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch {
      return SEED_COMMUNITY_POSTS;
    }
  }
  return SEED_COMMUNITY_POSTS;
}

export async function createCommunityPost(
  user: string,
  team: string,
  text: string,
  tag?: string
): Promise<CommunityPostItem[]> {
  const kv = await getKvStore();
  const current = await getCommunityFeed();
  const cleanName = user.trim().slice(0, 28) || "Fanático LVBP";
  const handle = `@${cleanName.toLowerCase().replace(/[^a-z0-9]/g, "_").slice(0, 16) || "lvbp_fan"}`;

  const newPost: CommunityPostItem = {
    id: `post-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    user: cleanName,
    handle,
    team: team.trim().slice(0, 5) || "CAR",
    time: getVenezuelaTimeString(),
    text: text.trim().slice(0, 280),
    tag: tag?.trim() || `#Vamos${team}`,
    likes: 1,
    fires: 1,
    claps: 0,
    createdAt: Date.now(),
  };

  const updated = [newPost, ...current].slice(0, 50);
  await kv.put("community:posts:v1", JSON.stringify(updated), { expirationTtl: 86400 * 60 });
  return updated;
}

export async function reactCommunityPost(
  postId: string,
  kind: "likes" | "fires" | "claps"
): Promise<CommunityPostItem[]> {
  const kv = await getKvStore();
  const current = await getCommunityFeed();
  const updated = current.map((post) =>
    post.id === postId ? { ...post, [kind]: (post[kind] || 0) + 1 } : post
  );
  await kv.put("community:posts:v1", JSON.stringify(updated), { expirationTtl: 86400 * 60 });
  return updated;
}
