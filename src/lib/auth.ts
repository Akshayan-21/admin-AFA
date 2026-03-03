/**
 * Auth helpers: login API call + localStorage session management.
 * Calls the external AFA auth service to get a JWT access token.
 */

const AUTH_API_URL =
  process.env.NEXT_PUBLIC_AUTH_API_URL ?? "https://afa-be.ngrok-free.dev";

export interface Session {
  token: string;
  userId: string;
  username?: string;
}

/**
 * Authenticate with the AFA backend.
 * Returns { access_token, user_id } on success, throws on failure.
 */
export async function login(
  email: string,
  password: string
): Promise<{ access_token: string; user_id: string; username?: string }> {
  const res = await fetch(`${AUTH_API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: email, password }),
  });

  if (!res.ok) {
    let message = "Invalid credentials";
    try {
      const data = await res.json();
      message = data?.detail ?? data?.message ?? message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  const data = await res.json();
  return {
    access_token: data.access_token,
    user_id: data.user_id,
    username: email,
  };
}

const SESSION_KEY = "afa_session";

export function saveSession(session: Session): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SESSION_KEY);
}
