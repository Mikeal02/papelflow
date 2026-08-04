// Opaque token sealing for provider credentials (e.g. Plaid access tokens).
//
// Provider access tokens must never be readable by the browser, and must never
// be usable by a different account than the one that created them. We therefore
// return an opaque envelope: AES-GCM(secret, plaintext) with the owner's user id
// bound as additional authenticated data. The client stores/echoes the envelope
// but cannot read it, and it cannot be replayed by another user because
// decryption with a different AAD fails.

const enc = new TextEncoder();
const dec = new TextDecoder();

let cachedKey: Promise<CryptoKey> | null = null;

function keyMaterial(): string {
  const s = Deno.env.get("PLAID_TOKEN_SEAL_KEY");
  if (!s || s.length < 16) throw new Error("seal_key_missing");
  return s;
}

function getKey(): Promise<CryptoKey> {
  if (!cachedKey) {
    cachedKey = (async () => {
      const digest = await crypto.subtle.digest("SHA-256", enc.encode(keyMaterial()));
      return crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, [
        "encrypt",
        "decrypt",
      ]);
    })();
  }
  return cachedKey;
}

const b64 = (b: Uint8Array) => btoa(String.fromCharCode(...b));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

/** Seal a provider secret so only this user can later redeem it. */
export async function sealToken(userId: string, plaintext: string): Promise<string> {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv, additionalData: enc.encode(`plaid:${userId}`) },
      key,
      enc.encode(plaintext),
    ),
  );
  return `sealed:v1:${b64(iv)}:${b64(ct)}`;
}

/** Redeem a sealed token. Returns null when tampered, foreign, or malformed. */
export async function openToken(userId: string, sealed: unknown): Promise<string | null> {
  if (typeof sealed !== "string" || !sealed.startsWith("sealed:v1:")) return null;
  const parts = sealed.split(":");
  if (parts.length !== 4) return null;
  try {
    const key = await getKey();
    const pt = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: unb64(parts[2]), additionalData: enc.encode(`plaid:${userId}`) },
      key,
      unb64(parts[3]),
    );
    return dec.decode(pt);
  } catch {
    return null;
  }
}
