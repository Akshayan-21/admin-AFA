import {
  CopilotRuntime,
  ExperimentalEmptyAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from "@copilotkit/runtime";
import { HttpAgent } from "@ag-ui/client";
import { NextRequest } from "next/server";

const GATEWAY_URL =
  process.env.NEXT_PUBLIC_GATEWAY_URL ?? "http://localhost:8003";

const serviceAdapter = new ExperimentalEmptyAdapter();

/**
 * Dynamic runtime: each request gets its own HttpAgent configured with
 * the authenticated user's user_id and Bearer token, forwarded to the
 * AFA Gateway /agui endpoint.
 */
function buildRuntime(userId: string, token: string) {
  return new CopilotRuntime({
    agents: {
      afa_agent: new HttpAgent({
        url: `${GATEWAY_URL}/agui?user_id=${encodeURIComponent(userId)}`,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }),
    },
  });
}

export const POST = async (req: NextRequest) => {
  // Extract auth metadata forwarded by the client (CopilotKit passes
  // arbitrary properties through the request body)
  let userId = "";
  let token = "";

  try {
    // Clone to read body without consuming it for the handler
    const cloned = req.clone();
    const body = await cloned.json();
    userId = body?.properties?.userId ?? body?.userId ?? "";
    token = body?.properties?.token ?? body?.token ?? "";
  } catch {
    // Ignore parse errors — handler will reject with 401 if auth missing
  }

  // Fallback: read from headers if client sends them directly
  if (!userId) userId = req.headers.get("x-user-id") ?? "";
  if (!token) {
    const authHeader = req.headers.get("authorization") ?? "";
    token = authHeader.replace(/^Bearer\s+/i, "");
  }

  const runtime = buildRuntime(userId, token);

  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime,
    serviceAdapter,
    endpoint: "/api/copilotkit",
  });

  return handleRequest(req);
};