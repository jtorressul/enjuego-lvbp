// ============================================================================
// EnJuego — Web Push Configuration & VAPID Credentials
// ============================================================================

export const VAPID_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  "BGTf06zHJ7XPZHwK00pJCHYqBNZBxterfCs1_bWPZCVy24jh73xDNJnyRC1Dz1RhAAZKNbbPWZxxBAf417z8n14";

export const VAPID_PRIVATE_KEY =
  process.env.VAPID_PRIVATE_KEY ||
  "s_LI5ghe4iAjlf7XdHeGsdNnYmD9X6pONx6bKQX1f3o";

export const VAPID_SUBJECT =
  process.env.VAPID_SUBJECT || "mailto:admin@enjuego.online";

/**
 * Converts a URL-safe Base64 string into a Uint8Array for PushManager subscription.
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
