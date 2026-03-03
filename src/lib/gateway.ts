/**
 * Typed REST client for the AFA Gateway backend.
 * All calls require (userId, token) for authentication.
 */

const GATEWAY_URL =
  process.env.NEXT_PUBLIC_GATEWAY_URL ?? "http://localhost:8003";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GatewaySession {
  session_id: string;
  label: string;
  created_at: string;
  updated_at: string;
}

export interface GatewayMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: string;
}

export interface GatewayUser {
  username: string;
  user_id: string;
  agent_id?: string;
  agent_name?: string;
  agent_onboard: boolean;
  agent_alive: boolean;
}

export interface GatewaySubagent {
  task_id: string;
  task: string;
  skill?: string;
  status: "running" | "completed" | "failed" | "cancelled";
  result_preview?: string;
  elapsed_seconds?: number;
  error?: string;
}

export interface GatewayRpc {
  _id: string;
  rpc_id: string;
  initiator_user_id: string;
  initiator_username: string;
  initiator_agent_id: string;
  target_user_id: string;
  target_username: string;
  target_agent_id: string;
  status: "pending" | "completed" | "error" | "timeout";
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface GatewayRpcMessage {
  _id: string;
  rpc_id: string;
  seq: number;
  direction: "request" | "response";
  sender_user_id: string;
  sender_username: string;
  content: string;
  timestamp: string;
}

export async function updateSessionLabel(
  userId: string,
  sessionId: string,
  label: string,
  token: string
): Promise<boolean> {
  const res = await fetch(`${GATEWAY_URL}/sessions/${sessionId}?user_id=${encodeURIComponent(userId)}`, {
    method: "PATCH",
    headers: {
      ...authHeaders(token),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ label }),
  });
  if (!res.ok) {
    console.error("updateSessionLabel error:", await res.text());
    return false;
  }
  return true;
}


// --- CopilotKit integration helpers ---──────────────────────────────────────────────────────────────

function authHeaders(token: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

async function gw<T>(
  url: string,
  options: RequestInit = {}
): Promise<T | null> {
  try {
    const res = await fetch(url, options);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

// ─── Agent Farm warm-up ────────────────────────────────────────────────────────

/**
 * Send a minimal AG-UI POST to /agui to trigger user registration in AgentFarm.
 * The backend /agui endpoint runs: lookup_agent → get_fingerprint → fetch_workspace
 *   → farm.get_or_create() before streaming any response.
 * We abort the SSE stream immediately after it starts — we only need the
 * side effect of farm registration, not the actual agent response.
 *
 * Must be awaited before calling GET or POST /sessions.
 */
export async function warmupUser(userId: string, token: string): Promise<boolean> {
  if (!userId || !token) return false;
  const ac = new AbortController();
  // Abort after 8s (enough to complete the handshake)
  const timeout = setTimeout(() => ac.abort(), 8000);
  try {
    const res = await fetch(
      `${GATEWAY_URL}/agui?user_id=${encodeURIComponent(userId)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        // Minimal valid AG-UI RunAgentInput with a dummy user message
        // The backend requires at least one user message to proceed
        body: JSON.stringify({
          threadId: `warmup_${userId.slice(-8)}_${Date.now()}`,
          runId: `wr_${Date.now()}`,
          messages: [
            {
              id: Date.now().toString(),
              role: "user",
              content: "ping",
            }
          ],
          tools: [],
          context: [],
          state: null,
          forwardedProps: [],
        }),
        signal: ac.signal,
      }
    );
    // Abort SSE stream immediately — we only needed the farm.get_or_create() side effect
    ac.abort();
    return res.ok || res.status === 200;
  } catch (e: unknown) {
    // AbortError is expected (we aborted it ourselves)
    if (e instanceof Error && e.name === "AbortError") return true;
    console.warn("[gateway] warmupUser failed:", e);
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

// ─── Sessions ─────────────────────────────────────────────────────────────────

export async function listSessions(
  userId: string,
  token: string
): Promise<GatewaySession[]> {
  const data = await gw<{ sessions: GatewaySession[] }>(
    `${GATEWAY_URL}/sessions?user_id=${encodeURIComponent(userId)}`,
    { headers: authHeaders(token) }
  );
  return data?.sessions ?? [];
}

export async function createSession(
  userId: string,
  token: string,
  label = "New chat",
  sessionId?: string
): Promise<string | null> {
  const params = new URLSearchParams({ user_id: userId, label });
  if (sessionId) params.set("session_id", sessionId);
  const data = await gw<{ session_id: string }>(
    `${GATEWAY_URL}/sessions?${params.toString()}`,
    { method: "POST", headers: authHeaders(token) }
  );
  return data?.session_id ?? null;
}

export async function getSessionTranscript(
  userId: string,
  sessionId: string,
  token: string
): Promise<GatewayMessage[]> {
  const data = await gw<{ messages: GatewayMessage[] }>(
    `${GATEWAY_URL}/sessions/transcript?user_id=${encodeURIComponent(userId)}&session_id=${encodeURIComponent(sessionId)}`,
    { headers: authHeaders(token) }
  );
  return data?.messages ?? [];
}

// ─── Users / Agents ───────────────────────────────────────────────────────────

export async function listUsers(token: string): Promise<GatewayUser[]> {
  const data = await gw<{ users: GatewayUser[] }>(`${GATEWAY_URL}/users/detail`, {
    headers: authHeaders(token),
  });
  return data?.users ?? [];
}

export async function getMyAgent(
  userId: string,
  token: string
): Promise<GatewayUser | null> {
  return gw<GatewayUser>(
    `${GATEWAY_URL}/users/me?user_id=${encodeURIComponent(userId)}`,
    { headers: authHeaders(token) }
  );
}

// ─── Chat (fallback non-streaming) ────────────────────────────────────────────

export async function sendMessage(
  userId: string,
  sessionId: string,
  message: string,
  token: string
): Promise<string | null> {
  const data = await gw<{ reply: string }>(
    `${GATEWAY_URL}/chat`,
    {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({ user_id: userId, session_id: sessionId, message }),
    }
  );
  return data?.reply ?? null;
}

// ─── Subagents ────────────────────────────────────────────────────────────────

export async function listSubagents(
  userId: string,
  token: string
): Promise<GatewaySubagent[]> {
  const data = await gw<{ subagents: GatewaySubagent[] }>(
    `${GATEWAY_URL}/subagents?user_id=${encodeURIComponent(userId)}`,
    { headers: authHeaders(token) }
  );
  return data?.subagents ?? [];
}


// ─── Agent-to-Agent RPCs ──────────────────────────────────────────────────────────

export async function listRpcs(
  userId: string,
  token: string,
  targetUserId?: string
): Promise<GatewayRpc[]> {
  const url = new URL(`${GATEWAY_URL}/rpcs`);
  url.searchParams.append("user_id", userId);
  if (targetUserId) {
    url.searchParams.append("target_user_id", targetUserId);
  }

  const res = await fetch(url.toString(), {
    headers: authHeaders(token),
  });
  if (!res.ok) {
    console.error("listRpcs error:", await res.text());
    return [];
  }
  const data = await res.json();
  return data.rpcs || [];
}

export async function getRpcMessages(
  userId: string,
  rpcId: string,
  token: string
): Promise<{ messages: GatewayRpcMessage[]; summary: string }> {
  const url = new URL(`${GATEWAY_URL}/rpcs/${rpcId}/messages`);
  url.searchParams.append("user_id", userId);

  const res = await fetch(url.toString(), {
    headers: authHeaders(token),
  });
  if (!res.ok) {
    console.error("getRpcMessages error:", await res.text());
    return { messages: [], summary: "" };
  }
  const data = await res.json();
  return { messages: data.messages || [], summary: data.summary || "" };
}
