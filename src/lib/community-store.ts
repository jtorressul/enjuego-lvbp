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

import { getAdminKv, type HybridKVStore } from "@/lib/admin-store";

async function getKvStore(): Promise<HybridKVStore> {
  const { kv } = await getAdminKv();
  return kv;
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

function cleanGameId(gameId: string) {
  return String(gameId).replace(/[^a-zA-Z0-9_-]/g, "");
}

async function readPresenceMap(gameId: string): Promise<Record<string, number>> {
  const kv = await getKvStore();
  const rawPresence = await kv.get(`presence:v2:${cleanGameId(gameId)}`, { skipKv: true });
  if (!rawPresence) return {};
  try {
    const parsed = JSON.parse(rawPresence);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export async function touchGamePresence(gameId: string, sessionId: string) {
  const sid = String(sessionId || "").slice(0, 64);
  if (!sid) return;
  const kv = await getKvStore();
  const now = Date.now();
  const presenceMap = await readPresenceMap(gameId);
  for (const [existingSid, ts] of Object.entries(presenceMap)) {
    if (now - ts > 180000) delete presenceMap[existingSid];
  }
  presenceMap[sid] = now;
  await kv.put(`presence:v2:${cleanGameId(gameId)}`, JSON.stringify(presenceMap), {
    expirationTtl: 3600,
    persistToKv: false,
  });
}

export async function getGameInteractiveState(
  gameId: string,
  _awayAbbr: string,
  _homeAbbr: string,
  _sessionId?: string
) {
  const kv = await getKvStore();
  const cleanId = cleanGameId(gameId);

  // 1. Real Votes (starts at 0 - no fake votes)
  const rawVotes = await kv.get(`votes:v2:${cleanId}`);
  let votes: GameVoteState = { awayVotes: 0, homeVotes: 0 };
  if (rawVotes) {
    try {
      votes = JSON.parse(rawVotes);
    } catch {
      votes = { awayVotes: 0, homeVotes: 0 };
    }
  }

  // 2. Real Chat (starts empty - no fake messages)
  const rawChat = await kv.get(`chat:v2:${cleanId}`);
  let chat: ChatMessageItem[] = [];
  if (rawChat) {
    try {
      chat = JSON.parse(rawChat);
    } catch {
      chat = [];
    }
  }

  // Read-only. Presence writes happen on POST action=presence so this GET stays cacheable.
  const now = Date.now();
  const presenceMap = await readPresenceMap(gameId);
  let activeRealSessions = 0;
  for (const ts of Object.values(presenceMap)) {
    if (now - ts <= 180000) activeRealSessions += 1;
  }
  activeRealSessions = Math.max(1, activeRealSessions);

  return {
    votes,
    chat,
    viewers: activeRealSessions,
    activeRealSessions,
  };
}

export async function castGameVote(
  gameId: string,
  side: "away" | "home"
): Promise<GameVoteState> {
  const kv = await getKvStore();
  const cleanId = String(gameId).replace(/[^a-zA-Z0-9_-]/g, "");
  const rawVotes = await kv.get(`votes:v2:${cleanId}`);
  const votes: GameVoteState = rawVotes
    ? JSON.parse(rawVotes)
    : { awayVotes: 0, homeVotes: 0 };

  if (side === "away") {
    votes.awayVotes += 1;
  } else {
    votes.homeVotes += 1;
  }

  await kv.put(`votes:v2:${cleanId}`, JSON.stringify(votes), { expirationTtl: 86400 * 30 });
  return votes;
}

export async function appendGameChat(
  gameId: string,
  awayAbbr: string,
  _homeAbbr: string,
  user: string,
  team: string,
  text: string
): Promise<ChatMessageItem[]> {
  const kv = await getKvStore();
  const cleanId = String(gameId).replace(/[^a-zA-Z0-9_-]/g, "");
  const rawChat = await kv.get(`chat:v2:${cleanId}`);
  let chat: ChatMessageItem[] = rawChat ? JSON.parse(rawChat) : [];

  const newMsg: ChatMessageItem = {
    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    user: user.trim().slice(0, 28) || "Aficionado",
    team: team.trim().slice(0, 5) || awayAbbr,
    text: text.trim().slice(0, 240),
    time: getVenezuelaTimeString(),
    createdAt: Date.now(),
  };

  chat = [...chat.slice(-49), newMsg];
  await kv.put(`chat:v2:${cleanId}`, JSON.stringify(chat), { expirationTtl: 86400 * 14 });
  return chat;
}

export async function getCommunityFeed(): Promise<CommunityPostItem[]> {
  const kv = await getKvStore();
  const raw = await kv.get("community:posts:v2");
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }
  return [];
}

export async function createCommunityPost(
  user: string,
  team: string,
  text: string,
  tag?: string
): Promise<CommunityPostItem[]> {
  const kv = await getKvStore();
  const current = await getCommunityFeed();
  const cleanName = user.trim().slice(0, 28) || "Aficionado LVBP";
  const handle = `@${cleanName.toLowerCase().replace(/[^a-z0-9]/g, "_").slice(0, 16) || "lvbp"}`;

  const newPost: CommunityPostItem = {
    id: `post-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    user: cleanName,
    handle,
    team: team.trim().slice(0, 5) || "CAR",
    time: getVenezuelaTimeString(),
    text: text.trim().slice(0, 280),
    tag: tag?.trim() || `#LVBP`,
    likes: 0,
    fires: 0,
    claps: 0,
    createdAt: Date.now(),
  };

  const updated = [newPost, ...current].slice(0, 50);
  await kv.put("community:posts:v2", JSON.stringify(updated), { expirationTtl: 86400 * 60 });
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
  await kv.put("community:posts:v2", JSON.stringify(updated), { expirationTtl: 86400 * 60 });
  return updated;
}
