export interface HeartbeatClientPayload {
  browser: string;
  browserVersion: string;
  deviceModel: string;
  platformVersion: string;
  viewport: string;
  isPwa: boolean;
  language: string;
}

const HINTS_STORAGE_KEY = "enjuego_device_hints_v1";

function parseBrowserFromUa(ua: string): { browser: string; version: string } {
  const s = ua || "";
  const edge = /Edg\/(\d+)/.exec(s);
  if (edge) return { browser: "Edge", version: edge[1] };
  const chrome = /Chrome\/(\d+)/.exec(s);
  if (chrome && !/Edg\//.test(s)) return { browser: "Chrome", version: chrome[1] };
  const firefox = /Firefox\/(\d+)/.exec(s);
  if (firefox) return { browser: "Firefox", version: firefox[1] };
  const safari = /Version\/(\d+).*Safari/.exec(s);
  if (safari && /Safari/.test(s) && !/Chrome/.test(s)) {
    return { browser: "Safari", version: safari[1] };
  }
  const opera = /OPR\/(\d+)/.exec(s);
  if (opera) return { browser: "Opera", version: opera[1] };
  return { browser: "Otro", version: "" };
}

function buildViewportLabel(): string {
  if (typeof window === "undefined") return "";
  const w = window.innerWidth;
  const h = window.innerHeight;
  const dpr =
    typeof window.devicePixelRatio === "number"
      ? Math.round(window.devicePixelRatio * 10) / 10
      : 1;
  const sw = typeof screen !== "undefined" ? screen.width : w;
  const sh = typeof screen !== "undefined" ? screen.height : h;
  return `${w}×${h} (pantalla ${sw}×${sh} @${dpr}x)`;
}

function readCachedExtended(): Partial<HeartbeatClientPayload> {
  if (typeof window === "undefined") return {};
  try {
    const raw = sessionStorage.getItem(HINTS_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Partial<HeartbeatClientPayload>;
  } catch {
    return {};
  }
}

async function loadExtendedHints(): Promise<Partial<HeartbeatClientPayload>> {
  if (typeof window === "undefined") return {};
  const cached = readCachedExtended();
  if (cached.deviceModel || cached.platformVersion) return cached;

  const uad = (
    navigator as Navigator & {
      userAgentData?: {
        getHighEntropyValues?: (
          hints: string[]
        ) => Promise<Record<string, string | undefined>>;
      };
    }
  ).userAgentData;
  if (!uad?.getHighEntropyValues) return cached;

  try {
    const values = await uad.getHighEntropyValues([
      "model",
      "platform",
      "platformVersion",
    ]);
    const extended: Partial<HeartbeatClientPayload> = {
      deviceModel: values.model ? String(values.model).slice(0, 48) : "",
      platformVersion: values.platformVersion
        ? String(values.platformVersion).slice(0, 24)
        : "",
    };
    sessionStorage.setItem(HINTS_STORAGE_KEY, JSON.stringify(extended));
    return extended;
  } catch {
    return cached;
  }
}

/** Sync slice for heartbeat; call once per mount to warm extended hints. */
export function getHeartbeatClientPayloadSync(): HeartbeatClientPayload {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const { browser, version } = parseBrowserFromUa(ua);
  const extended = readCachedExtended();
  const isPwa =
    typeof window !== "undefined" &&
    (window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true);

  return {
    browser,
    browserVersion: version,
    deviceModel: extended.deviceModel || "",
    platformVersion: extended.platformVersion || "",
    viewport: buildViewportLabel(),
    isPwa,
    language:
      typeof navigator !== "undefined"
        ? (navigator.language || "").slice(0, 16)
        : "",
  };
}

export async function warmExtendedDeviceHints(): Promise<void> {
  await loadExtendedHints();
}

export async function getHeartbeatClientPayload(): Promise<HeartbeatClientPayload> {
  const base = getHeartbeatClientPayloadSync();
  const extended = await loadExtendedHints();
  return {
    ...base,
    deviceModel: extended.deviceModel || base.deviceModel,
    platformVersion: extended.platformVersion || base.platformVersion,
  };
}
