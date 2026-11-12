import type { SignRequest } from "./nep413";

const KEY = "koelakan.pendingSign";

type Stored = Pick<SignRequest, "accountId" | "message" | "recipient" | "nonceBase64">;

/** Remember a request across a wallet redirect (the signature comes back in the URL hash). */
export function savePendingSign(req: SignRequest, storage: Pick<Storage, "setItem"> = sessionStorage): void {
  const stored: Stored = { accountId: req.accountId, message: req.message, recipient: req.recipient, nonceBase64: req.nonceBase64 };
  storage.setItem(KEY, JSON.stringify(stored));
}

export function takePendingSign(storage: Pick<Storage, "getItem" | "removeItem"> = sessionStorage): Stored | null {
  const raw = storage.getItem(KEY);
  storage.removeItem(KEY);
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Partial<Stored>;
    return v.accountId && v.message && v.recipient && v.nonceBase64 ? (v as Stored) : null;
  } catch {
    return null;
  }
}
