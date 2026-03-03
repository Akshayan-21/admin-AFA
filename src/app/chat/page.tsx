"use client";

import Image from "next/image";
import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CopilotKit, useCopilotChat } from "@copilotkit/react-core";
import { CopilotChat } from "@copilotkit/react-ui";
import "@copilotkit/react-ui/styles.css";
import { useAuth } from "@/lib/AuthContext";
import {
  createSession,
  listSessions,
  getSessionTranscript,
  listUsers,
  warmupUser,
  GatewaySession,
  GatewayUser,
  listRpcs,
  getRpcMessages,
  GatewayRpcMessage,
  GatewayMessage,
} from "@/lib/gateway";
import { useAFAEvents } from "@/lib/useAFAEvents";
import NotificationToast from "@/components/NotificationToast";

const GATEWAY_URL =
  process.env.NEXT_PUBLIC_GATEWAY_URL ?? "http://localhost:8003";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DisplayMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
}

interface RpcHistoryItem {
  rpcId: string;
  status: string;
  createdAt: string;
  messages: GatewayRpcMessage[];
  summary: string;
}

// ─── Inner component (needs CopilotKit context) ───────────────────────────────

function ChatInner() {
  const { userId, token, username, agentName, logout, isLoading: authLoading } = useAuth();
  const router = useRouter();

  // ── State ──────────────────────────────────────────────────────────────────
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [agentSearch, setAgentSearch] = useState("");

  // ── Session state ──────────────────────────────────────────────────────────
  const [sessions, setSessions] = useState<GatewaySession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);

  // ── RPC History state (for selected agent) ─────────────────────────────────
  const [rpcHistory, setRpcHistory] = useState<RpcHistoryItem[]>([]);
  const [rpcHistoryLoading, setRpcHistoryLoading] = useState(false);

  // Agents
  const [agents, setAgents] = useState<GatewayUser[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(true);

  // Chat
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  // Subagent drawer
  const [subagentDrawerOpen, setSubagentDrawerOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // AG-UI events
  const { rpcConversations, subagentTasks, notifications, dismissNotification, activeSubagentCount } =
    useAFAEvents();

  // ── Use CopilotKit for AG-UI streaming chat ────────────────────────────────
  const { visibleMessages, appendMessage, isLoading: isCopilotLoading } = useCopilotChat({
    id: activeSessionId ?? undefined,
    makeSystemMessage: () => "", // Backend injects workspace context
  });

  // ── Auth guard ─────────────────────────────────────────────────────────────
  // Wait until AuthContext has finished reading localStorage before checking.
  // Without this, userId/token are null on first render even with a valid session.
  useEffect(() => {
    if (!authLoading && (!userId || !token)) {
      router.push("/login");
    }
  }, [authLoading, userId, token, router]);

  // ── Refresh session labels after AI response (Phase 9) ──────────────────────
  useEffect(() => {
    if (!isCopilotLoading && !authLoading && userId && token && activeSessionId) {
      // Small delay to let the backend finish its async title generation
      const timeout = setTimeout(async () => {
        const fetched = await listSessions(userId, token);
        // Filter out empty "warmup_" sessions, but ALWAYS show the active one
        // so it doesn't disappear from the list while you are chatting.
        const displaySessions = fetched.filter(s => !s.label.startsWith("warmup_") || s.session_id === activeSessionId);
        setSessions(displaySessions);
      }, 3500);
      return () => clearTimeout(timeout);
    }
  }, [isCopilotLoading, authLoading, userId, token, activeSessionId]);

  // NOTE: No early return here — all hooks must run before any conditional return.
  // ── Load sessions on mount ─────────────────────────────────────────────────
  // Step 1: warmupUser() fires a minimal POST to /agui, which triggers
  // farm.get_or_create() on the backend — registering the user in AgentFarm.
  // Step 2: Once registered, GET /sessions works. Create default if none exist.
  useEffect(() => {
    if (!userId || !token) return;
    let cancelled = false;
    const run = async () => {
      setSessionsLoading(true);
      // Warm up the backend — registers user in AgentFarm (needed before /sessions)
      await warmupUser(userId, token);
      if (cancelled) return;
      // Now load sessions
      const fetched = await listSessions(userId, token);
      if (cancelled) return;
      if (fetched.length > 0) {
        // Filter out empty "warmup_" sessions from display
        const displaySessions = fetched.filter(s => !s.label.startsWith("warmup_"));
        setSessions(displaySessions);
        
        if (displaySessions.length > 0) {
          setActiveSessionId(displaySessions[0].session_id);
        } else {
          // If all were warmup, use the first one anyway or create new
          setActiveSessionId(fetched[0].session_id);
        }
      } else {
        // No sessions yet — create a default one
        const sid = await createSession(userId, token, "New Chat");
        if (sid && !cancelled) {
          setSessions([{ session_id: sid, label: "New Chat", created_at: new Date().toISOString(), updated_at: new Date().toISOString() }]);
          setActiveSessionId(sid);
        }
      }
      if (!cancelled) setSessionsLoading(false);
    };
    run();
    return () => { cancelled = true; };
  }, [userId, token]);

  // ── Load agents (poll every 30s for live status) ───────────────────────────
  const fetchAgents = useCallback(async () => {
    if (!token || !userId) return;
    setAgentsLoading(true);
    
    try {
      const [liveUsers, rpcs] = await Promise.all([
        listUsers(token),
        listRpcs(userId, token)
      ]);
      
      const userMap = new Map<string, GatewayUser>();
      
      // 1. Add live users first
      liveUsers.forEach(u => {
        if (u.user_id !== userId && u.username !== username) {
          userMap.set(u.user_id, u);
        }
      });
      
      // 2. Add offline historical users
      rpcs.forEach(rpc => {
        if (rpc.initiator_user_id === userId) {
          if (!userMap.has(rpc.target_user_id) && rpc.target_user_id !== userId) {
            userMap.set(rpc.target_user_id, {
              username: rpc.target_username,
              user_id: rpc.target_user_id,
              agent_id: rpc.target_agent_id,
              agent_name: rpc.target_username,
              agent_alive: false,
              agent_onboard: false
            });
          }
        } else if (rpc.target_user_id === userId) {
          if (!userMap.has(rpc.initiator_user_id) && rpc.initiator_user_id !== userId) {
            userMap.set(rpc.initiator_user_id, {
              username: rpc.initiator_username,
              user_id: rpc.initiator_user_id,
              agent_id: rpc.initiator_agent_id,
              agent_name: rpc.initiator_username,
              agent_alive: false,
              agent_onboard: false
            });
          }
        }
      });
      
      setAgents(Array.from(userMap.values()));
    } catch (err) {
      console.error("fetchAgents error:", err);
    }
    
    setAgentsLoading(false);
  }, [token, userId, username]);

  useEffect(() => {
    fetchAgents();
    const interval = setInterval(fetchAgents, 30000);
    return () => clearInterval(interval);
  }, [fetchAgents]);

  // ── Load Past RPC History when agent is selected ───────────────────────────
  useEffect(() => {
    if (!selectedAgentId || !userId || !token) return;
    (async () => {
      setRpcHistoryLoading(true);
      try {
        const rpcs = await listRpcs(userId, token, selectedAgentId);
        // Fetch message transcript for the top 5 most recent RPCs (ordered descending by created_at)
        const topRpcs = rpcs.slice(0, 5); 
        const historyItems: RpcHistoryItem[] = await Promise.all(
          topRpcs.map(async (rpc) => {
            const { messages, summary } = await getRpcMessages(userId, rpc.rpc_id, token);
            return {
              rpcId: rpc.rpc_id,
              status: rpc.status,
              createdAt: rpc.created_at,
              messages,
              summary,
            };
          })
        );
        setRpcHistory(historyItems);
      } catch (err) {
        console.error("Failed to fetch RPC history:", err);
      } finally {
        setRpcHistoryLoading(false);
      }
    })();
  }, [selectedAgentId, userId, token]);

  // ── Load transcript when switching session ─────────────────────────────────
  useEffect(() => {
    if (!activeSessionId || !userId || !token) {
      if (!activeSessionId) setMessages([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setMessagesLoading(true);
      try {
        const transcript = await getSessionTranscript(userId, activeSessionId, token);
        if (cancelled) return;
        setMessages(
          transcript.map((m, i) => ({
            id: `${activeSessionId}_${i}`,
            role: m.role === "assistant" ? "assistant" : "user",
            content: m.content,
            timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
          }))
        );
      } catch (err) {
        console.error("Failed to load transcript:", err);
      } finally {
        if (!cancelled) setMessagesLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [activeSessionId, userId, token]);

  // ── Auto-scroll ────────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // ── Click outside profile ──────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── New chat ───────────────────────────────────────────────────────────────
  const handleNewChat = () => {
    // Generate a local session ID — the backend will register it automatically
    // on the first message sent via /agui (no need to pre-create via REST).
    const sid = `sess_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
    const newSession: GatewaySession = {
      session_id: sid,
      label: "New Chat",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(sid);
    setMessages([]);
  };


  // Sync CopilotKit streamed messages to our local UI state
  useEffect(() => {
    // If CopilotKit is loading (streaming), the last message from visibleMessages
    // contains the partial text. Wait until it starts producing assistant text.
    if (!visibleMessages || visibleMessages.length === 0) return;
    const lastCopilotMsg = visibleMessages[visibleMessages.length - 1] as any;
    
    // We only sync assistant messages (user messages are optimistically added)
    if (lastCopilotMsg.role !== "assistant") return;
    
    // Check if we are already streaming this specific message ID.
    // If not, it means the backend just started generating a new reply.
    setMessages((prev) => {
      const isExisting = prev.some((m) => m.id === lastCopilotMsg.id);
      if (isExisting) {
        // Update the existing message with new streamed content
        return prev.map((m) =>
          m.id === lastCopilotMsg.id ? { ...m, content: lastCopilotMsg.content as string } : m
        );
      } else {
        // First chunk of a new message
        return [
          ...prev,
          {
            id: lastCopilotMsg.id,
            role: "assistant",
            content: lastCopilotMsg.content as string,
            timestamp: new Date(),
          },
        ];
      }
    });
  }, [visibleMessages]);

  // Sync the typing indicator
  useEffect(() => {
    // We only show our custom "typing dots" if Copilot is loading BUT
    // it hasn't started yielding text yet (last message is still user).
    // Once it yields assistant text, the text streams live instead.
    if (isCopilotLoading) {
      const lastCopilotMsg = visibleMessages ? visibleMessages[visibleMessages.length - 1] as any : null;
      if (!lastCopilotMsg || lastCopilotMsg.role === "user") {
        setIsTyping(true);
      } else {
        setIsTyping(false);
      }
    } else {
      setIsTyping(false);
    }
  }, [isCopilotLoading, visibleMessages]);

  const handleSend = async () => {
    if (!input.trim() || !userId || !token || !activeSessionId) return;
    const userContent = input.trim();
    setInput("");

    // 1. Optimistically append user message to local state
    const userMsg: DisplayMessage = {
      id: Date.now().toString(),
      role: "user",
      content: userContent,
      timestamp: new Date(),
    };
    
    setMessages((prev) => {
      const updated = [...prev, userMsg];
      // Auto-label session on very first message using the REST API
      if (prev.length === 0) {
        const label = userContent.slice(0, 30) + (userContent.length > 30 ? "…" : "");
        setSessions((s) =>
          s.map((session) =>
            session.session_id === activeSessionId ? { ...session, label } : session
          )
        );
        import("@/lib/gateway").then(m => m.updateSessionLabel(userId, activeSessionId, label, token));
      }
      return updated;
    });

    // 2. Clear any previous complete AI message so we can stream the new one
    // (We only keep the history + the new user message. CopilotKit state
    // handles the streaming reply, which we intercept below via useEffect)
    
    // 3. Send through CopilotKit (triggers POST /api/copilotkit -> backend /agui)
    appendMessage({
      id: Date.now().toString(),
      role: "user",
      content: userContent,
    } as any);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleDeleteSession = (id: string) => {
    setSessions((prev) => {
      const filtered = prev.filter((s) => s.session_id !== id);
      if (activeSessionId === id) {
        if (filtered.length > 0) setActiveSessionId(filtered[0].session_id);
        else { setActiveSessionId(null); setMessages([]); }
      }
      return filtered;
    });
  };

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  // ── Derived ────────────────────────────────────────────────────────────────
  const activeSession = sessions.find((s) => s.session_id === activeSessionId);
  const filteredAgents = agents.filter(
    (a) =>
      a.username.toLowerCase().includes(agentSearch.toLowerCase()) ||
      (a.agent_name ?? "").toLowerCase().includes(agentSearch.toLowerCase())
  );
  const selectedAgent = agents.find((a) => a.user_id === selectedAgentId);
  // RPC conversations for the selected agent
  const agentRpcConvs = rpcConversations.filter(
    (c) => !selectedAgentId || c.toUsername === selectedAgent?.username || c.fromUsername === selectedAgent?.username
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  // All hooks have been called above — safe to do a conditional return here.
  if (authLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#f4f4f8", flexDirection: "column", gap: "16px" }}>
        <div style={{ width: "40px", height: "40px", border: "3px solid #e85d45", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <style>{"@keyframes spin { to { transform: rotate(360deg); } }"}</style>
      </div>
    );
  }

  return (
    <>
      <div className="flex h-screen overflow-hidden bg-[#f4f4f8] text-[#2d2d3a]">

        {/* ═══ LEFT SIDEBAR ═══ */}
        <div className={`transition-all duration-350 shrink-0 overflow-hidden border-r border-black/[0.06] shadow-[2px_0_24px_rgba(0,0,0,0.03),4px_0_8px_rgba(0,0,0,0.01)] md:static fixed top-0 left-0 z-[100] h-screen bg-gradient-to-b from-white to-[#fbfbfe] flex flex-col ${sidebarOpen ? "w-[280px] max-w-[85vw]" : "w-0 !border-none !shadow-none"}`}>
          <div className="p-[18px_16px_14px] flex items-center justify-between border-b border-[#ececf0]">
            <div className="flex items-center gap-[10px]">
              <div className="w-[34px] h-[34px] rounded-[10px] bg-gradient-to-br from-[#e85d45] to-[#c73a28] flex items-center justify-center shadow-[0_3px_10px_rgba(232,93,69,0.2)]">
                <Image src="/logo_main.png" alt="M" width={20} height={20} className="object-contain brightness-0 invert" />
              </div>
              <span className="text-[16px] font-bold text-[#1a1a2e] tracking-tight">Miraee</span>
            </div>
            <button className="w-[30px] h-[30px] flex items-center justify-center bg-[#f4f4f8] hover:bg-[#e8e8ee] border-none rounded-[8px] text-[#b0b0be] hover:text-[#888] cursor-pointer text-[13px] transition-all duration-200" onClick={() => setSidebarOpen(false)}>✕</button>
          </div>

          <Button
            className="m-[14px_14px_6px] h-[44px] rounded-full bg-gradient-to-br from-[#e85d45] to-[#c73a28] hover:from-[#f06e58] hover:to-[#d64a36] text-white border-none shadow-[0_4px_16px_rgba(232,93,69,0.25)] transition-all duration-300 hover:shadow-[0_8px_32px_rgba(232,93,69,0.3)] active:scale-[0.98] font-semibold text-[14px]"
            onClick={handleNewChat}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="mr-2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            New Chat
          </Button>

          <div className="flex-1 overflow-y-auto p-[6px_10px] [&::-webkit-scrollbar]:w-[3px] [&::-webkit-scrollbar-thumb]:bg-[#dddde5] [&::-webkit-scrollbar-thumb]:rounded-[3px]">
            <div className="p-[14px_8px_6px] text-[10px] font-bold text-[#b5b5c4] uppercase tracking-[0.1em]">Recent Chats</div>
            {sessionsLoading ? (
              <div className="p-[20px] text-center text-[12px] text-[#b5b5c4]">Loading sessions…</div>
            ) : sessions.map((s) => (
              <div
                key={s.session_id}
                className={`p-[10px_12px] rounded-[10px] cursor-pointer flex items-center gap-[10px] transition-all duration-200 mb-[3px] border border-transparent hover:bg-[#f7f7fa] hover:border-[#ececf0] hover:shadow-[0_1px_6px_rgba(0,0,0,0.03)] group ${s.session_id === activeSessionId ? "bg-[#e85d45]/5 border-[#e85d45]/10 shadow-[0_2px_10px_rgba(232,93,69,0.06)] on" : ""}`}
                onClick={() => setActiveSessionId(s.session_id)}
              >
                <div className="w-[30px] h-[30px] rounded-[8px] bg-[#f4f4f8] flex items-center justify-center shrink-0 text-[#b0b0be] text-[12px] transition-all duration-200 group-[.on]:bg-[#e85d45]/10 group-[.on]:text-[#e85d45]">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                </div>
                <span className="text-[13px] text-[#8a8a9a] whitespace-nowrap overflow-hidden text-ellipsis flex-1 group-[.on]:text-[#2d2d3a] group-[.on]:font-semibold">{s.label}</span>
                <button className="opacity-0 bg-transparent border-none text-[#c5c5d0] cursor-pointer text-[11px] p-[4px_6px] rounded-[6px] transition-all duration-150 shrink-0 group-hover:opacity-100 hover:!text-[#e85d45] hover:!bg-[#e85d45]/5" onClick={(e) => { e.stopPropagation(); handleDeleteSession(s.session_id); }}>✕</button>
              </div>
            ))}
          </div>

          {/* Profile */}
          <div className="relative mt-auto w-full border-t border-[#ececf0]" ref={profileRef}>
            {profileOpen && (
              <div className="absolute bottom-[calc(100%+12px)] left-[16px] w-[calc(100%-32px)] bg-white/85 backdrop-blur-xl border border-black/5 rounded-[16px] p-[6px] z-[999] shadow-[0_4px_24px_rgba(0,0,0,0.08),0_1px_4px_rgba(0,0,0,0.02)] origin-bottom-left animate-in fade-in zoom-in-95 duration-200">
                <div className="p-[12px] border-b border-black/[0.04] flex items-center gap-[10px] mb-[4px]">
                  <div className="w-[38px] h-[38px] rounded-[12px] bg-gradient-to-br from-[#e85d45] to-[#c73a28] flex items-center justify-center text-white text-[14px] font-bold shrink-0">
                    {(username ?? "U").charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-semibold text-[#1a1a2e]">{username ?? "User"}</div>
                    <div className="text-[11px] text-[#8a8a9a] whitespace-nowrap overflow-hidden text-ellipsis">{agentName ?? "Agent"}</div>
                  </div>
                </div>
                <button className="w-full flex items-center gap-[10px] p-[10px_12px] border-none bg-transparent rounded-[10px] cursor-pointer text-[13px] font-medium transition-all duration-200 text-left text-[#dc2626] mt-[4px] hover:bg-[#dc2626]/10" onClick={handleLogout}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                  Sign out
                </button>
              </div>
            )}
            <div className="p-[14px_16px] border-t border-[#ececf0] flex items-center gap-[11px] bg-[#f9f9fc] hover:bg-black/[0.02] transition-colors cursor-pointer" onClick={() => setProfileOpen(!profileOpen)}>
              <div className="w-[38px] h-[38px] rounded-[12px] bg-gradient-to-br from-[#e85d45] to-[#c73a28] flex items-center justify-center text-white text-[14px] font-bold shrink-0 shadow-[0_3px_10px_rgba(232,93,69,0.2)] relative after:absolute after:-bottom-[1px] after:-right-[1px] after:w-[10px] after:h-[10px] after:rounded-full after:bg-[#10b981] after:border-[2px] after:border-[#f9f9fc]">
                {(username ?? "U").charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0 flex items-center justify-between">
                <div><div className="text-[13px] font-semibold text-[#2d2d3a]">{username ?? "User"}</div><div className="text-[11px] text-[#9ca3af]">{agentName ?? "Agent"}</div></div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#b5b5c4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-200 ${profileOpen ? "rotate-180" : ""}`}><polyline points="6 9 12 15 18 9"/></svg>
              </div>
            </div>
          </div>
        </div>

        {/* ═══ MAIN CHAT ═══ */}
        <div className="flex-1 flex flex-col min-w-0 bg-gradient-to-b from-[#f9f9fc] via-[#f3f3f8] to-[#eff0f5]">
          {/* Header */}
          <div className="h-[60px] max-sm:h-[52px] flex items-center px-6 max-sm:px-4 gap-3 shrink-0 bg-white/75 backdrop-blur-xl border-b border-black/5 shadow-[0_1px_8px_rgba(0,0,0,0.02),0_4px_16px_rgba(0,0,0,0.01)]">
            {!sidebarOpen && (
              <button className="w-[38px] h-[38px] flex items-center justify-center bg-white/80 border border-black/5 rounded-[10px] cursor-pointer text-[#999] transition-all duration-250 shadow-[0_1px_4px_rgba(0,0,0,0.03)] hover:bg-white hover:border-black/10 hover:text-[#666] hover:shadow-[0_3px_12px_rgba(0,0,0,0.06)] hover:-translate-y-[1px]" onClick={() => setSidebarOpen(true)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
              </button>
            )}
            <span className="flex-1 text-[14px] font-semibold text-[#3d3d4e] tracking-[-0.01em]">{activeSession?.label ?? "New Chat"}</span>
            
            {/* Subagent badge */}
            {activeSubagentCount > 0 && (
              <button
                onClick={() => setSubagentDrawerOpen(true)}
                className="flex items-center gap-[6px] px-3 py-1.5 bg-[#e85d45]/10 border border-[#e85d45]/20 rounded-full text-[11px] font-semibold text-[#e85d45] cursor-pointer hover:bg-[#e85d45]/15 transition-colors"
              >
                <span className="w-[6px] h-[6px] rounded-full bg-[#e85d45] animate-pulse" />
                {activeSubagentCount} task{activeSubagentCount > 1 ? "s" : ""} running
              </button>
            )}

            <button className={`w-[38px] h-[38px] flex items-center justify-center bg-white/80 border border-black/5 rounded-[10px] cursor-pointer text-[#999] transition-all duration-250 shadow-[0_1px_4px_rgba(0,0,0,0.03)] hover:bg-white hover:border-black/10 hover:text-[#666] hover:shadow-[0_3px_12px_rgba(0,0,0,0.06)] hover:-translate-y-[1px] ${rightPanelOpen ? "bg-[#e85d45]/5 border-[#e85d45]/20 text-[#e85d45]" : ""}`} onClick={() => setRightPanelOpen(!rightPanelOpen)} title="Toggle side panel">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="15" y1="3" x2="15" y2="21"/></svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-[36px_28px_16px] [&::-webkit-scrollbar]:w-[5px] [&::-webkit-scrollbar-thumb]:bg-[#dddde5] [&::-webkit-scrollbar-thumb]:rounded-[5px]">
            <div className="max-w-[740px] w-full mx-auto">
              {messagesLoading ? (
                <div className="h-full flex flex-col items-center justify-center py-20">
                  <div className="w-8 h-8 border-2 border-[#e85d45] border-t-transparent rounded-full animate-spin mb-4" />
                  <p className="text-[13px] text-[#8a8a9a]">Loading messages...</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center gap-[20px] animate-in slide-in-from-bottom-5 fade-in duration-500">
                  <div className="flex items-center justify-center relative mb-[4px]">
                    <Image src="/logo_main.png" alt="Miraee" width={180} height={60} className="object-contain" priority />
                  </div>
                  <h2>Where would you like to go?</h2>
                  <p>I&apos;m your Miraee Travel assistant. I can help you book flights, find hotels, and arrange cabs.</p>
                  <div className="flex flex-wrap gap-[10px] justify-center max-w-[560px] mt-[6px]">
                    {["Book a flight to Dubai", "Find hotels in Goa", "Airport cab in Mumbai", "Plan a Rajasthan trip"].map((s) => (
                      <button key={s} className="p-[11px_22px] bg-white/90 border border-black/5 rounded-[28px] text-[13px] font-medium text-[#777] cursor-pointer transition-all duration-300 shadow-[0_2px_8px_rgba(0,0,0,0.03)] backdrop-blur-md hover:border-[#e85d45]/30 hover:text-[#e85d45] hover:bg-white hover:-translate-y-[3px] hover:shadow-[0_8px_24px_rgba(232,93,69,0.1),0_2px_6px_rgba(0,0,0,0.04)]" onClick={() => { setInput(s); inputRef.current?.focus(); }}>{s}</button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((m) => (
                    <div key={m.id} className={`flex mb-[20px] animate-in slide-in-from-bottom-2 fade-in duration-300 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                      {m.role === "assistant" && (
                        <div className="w-[36px] h-[36px] rounded-[12px] flex items-center justify-center text-[12px] font-bold shrink-0 mt-[4px] mr-[12px] text-white bg-gradient-to-br from-[#e85d45] to-[#c73a28] shadow-[0_3px_10px_rgba(232,93,69,0.2)] relative">
                          M
                          <div className="absolute -bottom-1 -right-1 w-[10px] h-[10px] bg-[#10b981] rounded-full border-[2px] border-[#f4f4f8]" />
                        </div>
                      )}
                      <div className={`max-w-[80%] max-sm:max-w-[90%] flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}>
                        <div className="text-[11px] font-semibold text-[#8a8a9a] mb-[6px] px-[6px] tracking-wide">{m.role === "user" ? (username ?? "You") : (agentName ?? "Miraee AI")}</div>
                        <div className={`text-[14px] leading-[1.7] whitespace-pre-wrap break-words p-[16px_20px] ${m.role === "user" ? "bg-[#1a1a2e] text-white rounded-[24px_24px_6px_24px] shadow-[0_4px_16px_rgba(26,26,46,0.15)]" : "bg-white text-[#2d2d3a] border border-[#ececf0] rounded-[24px_24px_24px_6px] shadow-[0_4px_20px_rgba(0,0,0,0.03)]"}`}>
                          {m.content}
                        </div>
                      </div>
                      {m.role === "user" && (
                        <div className="w-[36px] h-[36px] rounded-[12px] flex items-center justify-center text-[12px] font-bold shrink-0 mt-[4px] ml-[12px] text-[#1a1a2e] bg-white border border-[#ececf0] shadow-[0_2px_6px_rgba(0,0,0,0.04)]">
                          {(username ?? "U").charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                  ))}
                  {isTyping && (
                    <div className="flex justify-start mb-[20px] animate-in slide-in-from-bottom-2 fade-in duration-300">
                      <div className="w-[36px] h-[36px] rounded-[12px] flex items-center justify-center text-[12px] font-bold shrink-0 mt-[4px] mr-[12px] text-white bg-gradient-to-br from-[#e85d45] to-[#c73a28] shadow-[0_3px_10px_rgba(232,93,69,0.2)]">M</div>
                      <div className="flex flex-col items-start">
                        <div className="text-[11px] font-semibold text-[#8a8a9a] mb-[6px] px-[6px] tracking-wide">{agentName ?? "Miraee AI"}</div>
                        <div className="bg-white border border-[#ececf0] rounded-[24px_24px_24px_6px] shadow-[0_4px_20px_rgba(0,0,0,0.03)] p-[18px_20px]">
                          <div className="flex gap-[6px]">
                            <div className="w-[8px] h-[8px] rounded-full bg-[#b5b5c4] animate-[bounce_1s_infinite_-0.3s]" />
                            <div className="w-[8px] h-[8px] rounded-full bg-[#b5b5c4] animate-[bounce_1s_infinite_-0.15s]" />
                            <div className="w-[8px] h-[8px] rounded-full bg-[#b5b5c4] animate-[bounce_1s_infinite]" />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input */}
          <div className="p-[10px_16px_20px] sm:p-[12px_20px_24px] md:p-[12px_28px_28px] shrink-0">
            <div className="max-w-[740px] mx-auto relative bg-white border-[1.5px] border-black/5 rounded-[24px] focus-within:border-[#e85d45]/25 focus-within:shadow-[0_0_0_4px_rgba(232,93,69,0.05),0_12px_40px_rgba(0,0,0,0.06)] transition-all duration-300 flex items-end">
              <textarea ref={inputRef} rows={1} placeholder="Search flights, hotels, or cabs..." value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown}
                className="flex-1 bg-transparent border-none outline-none p-[16px_20px] text-[14px] text-[#2d2d3a] placeholder:text-[#b5b5c4] resize-none overflow-hidden min-h-[54px] max-h-[200px]"
                onInput={(e) => { const t = e.target as HTMLTextAreaElement; t.style.height = "auto"; t.style.height = Math.min(t.scrollHeight, 200) + "px"; }} />
              <div className="p-[0_10px_10px_0]">
                <button className="w-[36px] h-[36px] rounded-[12px] border-none bg-gradient-to-br from-[#e85d45] to-[#c73a28] text-white cursor-pointer flex items-center justify-center transition-all duration-300 shadow-[0_4px_12px_rgba(232,93,69,0.2)] hover:-translate-y-[1px] disabled:opacity-30 disabled:cursor-not-allowed" onClick={handleSend} disabled={!input.trim() || isTyping}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                </button>
              </div>
            </div>
            <p className="text-center text-[11px] text-[#b5b5c4] mt-[12px] tracking-[0.01em]">Miraee Travel helps find the best deals. Always verify booking details before confirmation.</p>
          </div>
        </div>

        {/* ═══ RIGHT PANEL ═══ */}
        <div className={`transition-all duration-350 shrink-0 overflow-hidden border-l border-black/5 flex flex-col shadow-[-4px_0_24px_rgba(0,0,0,0.02)] md:relative fixed top-0 right-0 z-[100] h-screen bg-white ${rightPanelOpen ? "w-full sm:w-[320px] md:w-[380px] opacity-100" : "w-0 opacity-0 !border-none"}`}>

          {/* Agent Detail Overlay (A2A conversations for selected agent) */}
          {selectedAgent && (
            <div className="absolute inset-0 bg-gradient-to-b from-white to-[#fbfbfe] flex flex-col z-10 animate-in slide-in-from-right duration-300">
              <div className="p-[16px_20px] flex items-center gap-[10px] border-b border-black/5 shrink-0 bg-white/70 backdrop-blur-md">
                <button className="w-[32px] h-[32px] flex items-center justify-center bg-black/5 border-none rounded-[9px] text-[#8a8a9a] cursor-pointer hover:bg-black/10 hover:text-[#2d2d3a]" onClick={() => setSelectedAgentId(null)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                </button>
                <div className="w-[32px] h-[32px] rounded-[9px] flex items-center justify-center text-white text-[12px] font-bold shrink-0 shadow-[0_2px_8px_rgba(0,0,0,0.12)] bg-gradient-to-br from-[#e85d45] to-[#c73a28]">
                  {selectedAgent.username.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-bold text-[#1a1a2e]">{selectedAgent.username}</div>
                  <div className="text-[11px] text-[#8a8a9a]">{selectedAgent.agent_name ?? "Agent"}</div>
                </div>
                <div className={`w-[8px] h-[8px] rounded-full shrink-0 ${selectedAgent.agent_alive ? "bg-[#10b981] shadow-[0_0_8px_rgba(16,185,129,0.4)]" : "bg-[#d1d5db]"}`} />
              </div>

              <div className="flex-1 overflow-y-auto p-[20px] flex flex-col gap-[20px] [&::-webkit-scrollbar]:w-[3px] [&::-webkit-scrollbar-thumb]:bg-[#dddde5] [&::-webkit-scrollbar-thumb]:rounded-[3px]">
                {rpcHistoryLoading ? (
                  <div className="flex items-center justify-center p-[40px] text-[#b5b5c4]">
                    <div className="w-[20px] h-[20px] border-[2px] border-[#b5b5c4] border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : (
                  <>
                    {/* SECTION 1: Summary of Last Conversation */}
                    {rpcHistory.length > 0 && !agentRpcConvs.length && (
                      <div className="flex flex-col">
                        <div className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-[0.1em] mb-[12px] px-[2px]">Last Conversation summary</div>
                        <div className="bg-white border border-[#ececf0] rounded-[16px] shadow-[0_2px_12px_rgba(0,0,0,0.03)] p-[16px]">
                          <div className="text-[11px] text-[#b5b5c4] mb-[12px] flex items-center justify-between">
                            <span>rpc#{rpcHistory[0].rpcId.slice(-6)}</span>
                            <span>{new Date(rpcHistory[0].createdAt).toLocaleDateString()}</span>
                          </div>
                          
                          {rpcHistory[0].summary ? (
                            <div className="text-[13px] text-[#2d2d3a] leading-relaxed border-l-2 border-[#e85d45] pl-[10px] py-[2px] italic">
                              {rpcHistory[0].summary}
                            </div>
                          ) : rpcHistory[0].messages.length > 0 ? (
                            <div className="flex flex-col gap-[8px]">
                              {rpcHistory[0].messages.filter(m => m.direction === 'request').slice(-1).map((msg, idx) => (
                                <div key={`req-${idx}`} className="text-[13px] text-[#2d2d3a] border-l-2 border-[#e85d45] pl-[10px]">
                                  <span className="font-bold text-[10px] uppercase text-[#e85d45] block mb-[2px]">Request:</span>
                                  {msg.content}
                                </div>
                              ))}
                              {rpcHistory[0].messages.filter(m => m.direction === 'response').slice(-1).map((msg, idx) => (
                                <div key={`res-${idx}`} className="text-[13px] text-[#2d2d3a] border-l-2 border-[#10b981] pl-[10px] mt-[6px]">
                                  <span className="font-bold text-[10px] uppercase text-[#10b981] block mb-[2px]">Response:</span>
                                  {msg.content}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-[13px] text-[#8a8a9a] italic">No messages recorded in this call.</div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* SECTION 2: Live A2A Conversations */}
                    {agentRpcConvs.length > 0 && (
                      <div className="flex flex-col">
                        <div className="text-[10px] font-bold text-[#e85d45] uppercase tracking-[0.1em] mb-[12px] px-[2px] flex items-center gap-[6px]">
                          <span className="w-[6px] h-[6px] rounded-full bg-[#ff4757] animate-pulse"></span>
                          Live Conversation
                        </div>
                        {agentRpcConvs.map((conv) => (
                          <div key={conv.rpcId} className="border border-[#e85d45]/30 bg-white rounded-[16px] shadow-[0_4px_24px_rgba(232,93,69,0.08)] overflow-hidden">
                            <div className="p-[12px_16px] bg-[#f7f7fa] border-b border-[#e85d45]/10 flex items-center gap-[10px]">
                              <span className="text-[11px] font-medium text-[#8a8a9a] ml-auto">rpc#{conv.rpcId.slice(-6)}</span>
                            </div>
                            <div className="p-[16px] flex flex-col gap-[12px]">
                              {conv.messages.map((msg, i) => (
                                <div key={i} className={`text-[13px] leading-tight p-[10px_14px] rounded-[12px] max-w-[90%] shadow-[0_1px_2px_rgba(0,0,0,0.04)] ${msg.from === conv.fromUsername ? "bg-gradient-to-br from-[#e85d45] to-[#c73a28] text-white self-end rounded-br-[4px]" : "bg-[#f0f0f5] text-[#2d2d3a] self-start rounded-bl-[4px]"}`}>
                                  <div className="font-bold text-[9px] uppercase tracking-wide mb-[4px] opacity-70">{msg.from}</div>
                                  {msg.text}
                                </div>
                              ))}
                              {conv.isTyping && (
                                <div className="text-[12px] text-[#9ca3af] flex items-center gap-[8px] italic mt-[4px]">
                                  <div className="flex gap-[4px]"><span className="w-[4px] h-[4px] bg-[#b5b5c4] rounded-full animate-bounce inline-block" style={{animationDelay: '0s'}} /><span className="w-[4px] h-[4px] bg-[#b5b5c4] rounded-full animate-bounce inline-block" style={{animationDelay: '0.15s'}} /><span className="w-[4px] h-[4px] bg-[#b5b5c4] rounded-full animate-bounce inline-block" style={{animationDelay: '0.3s'}} /></div>
                                  Waiting for Agent response...
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* SECTION 3: History of all past conversations */}
                    {rpcHistory.length > 0 && (
                      <div className="flex flex-col mt-[10px]">
                        <div className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-[0.1em] mb-[12px] px-[2px]">Complete History</div>
                        <div className="flex flex-col gap-[12px]">
                          {rpcHistory.map((rpc, index) => (
                            <details key={rpc.rpcId} className="group bg-white border border-[#ececf0] rounded-[16px] shadow-[0_2px_8px_rgba(0,0,0,0.02)] overflow-hidden">
                              <summary className="p-[14px_16px] cursor-pointer flex items-center justify-between hover:bg-[#f9f9fc] transition-colors select-none">
                                <span className="text-[13px] font-semibold text-[#2d2d3a]">rpc#{rpc.rpcId.slice(-6)}</span>
                                <div className="flex items-center gap-[12px]">
                                  <span className="text-[11px] text-[#b5b5c4]">{new Date(rpc.createdAt).toLocaleDateString()}</span>
                                  <svg className="w-[14px] h-[14px] text-[#b5b5c4] transition-transform duration-200 group-open:-scale-y-100" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                                </div>
                              </summary>
                              <div className="p-[16px] pt-0 border-t border-[#f0f0f5]">
                                {rpc.messages.length > 0 ? (
                                  <div className="flex flex-col gap-[10px] mt-[12px]">
                                    {rpc.messages.map((msg, i) => (
                                      <div key={i} className={`text-[12px] leading-relaxed p-[10px_14px] rounded-[12px] max-w-[95%] ${msg.direction === 'request' ? (msg.sender_user_id === userId ? "bg-[#f0f0f5] text-[#2d2d3a] self-start rounded-bl-[4px]" : "bg-gradient-to-br from-[#e85d45] to-[#c73a28] text-white self-end rounded-br-[4px]") : (msg.sender_user_id === userId ? "bg-gradient-to-br from-[#10b981] to-[#047857] text-white self-end rounded-br-[4px]" : "bg-[#f0f0f5] text-[#2d2d3a] self-start rounded-bl-[4px]")}`}>
                                        <div className="font-bold text-[9px] uppercase tracking-wide mb-[4px] opacity-70">{msg.sender_username}</div>
                                        {msg.content}
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="text-center p-[20px] text-[12px] text-[#b5b5c4]">No messages recorded.</div>
                                )}
                              </div>
                            </details>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Fallback empty state */}
                    {rpcHistory.length === 0 && agentRpcConvs.length === 0 && (
                      <div className="flex flex-col items-center justify-center p-[40px_20px] bg-[#f9f9fc] border border-[#ececf0] rounded-[14px] mt-4">
                        <div className="text-[32px] mb-[12px] opacity-70">💬</div>
                        <div className="text-[13px] text-[#9ca3af] font-medium text-center">No agent-to-agent conversations yet.<br/>Send a message that mentions this user.</div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Default right panel: Your Agent + Agent Farm */}
          <div className="p-[18px_22px] flex items-center justify-between border-b border-black/5 bg-white/60 backdrop-blur-md">
            <h3 className="text-[15px] font-bold text-[#1a1a2e]">Agents</h3>
            <button onClick={() => setRightPanelOpen(false)} className="bg-transparent border-none text-[#b5b5c4] cursor-pointer text-[16px]">✕</button>
          </div>

          <div className="flex-1 overflow-y-auto p-[20px] [&::-webkit-scrollbar]:w-[3px] [&::-webkit-scrollbar-thumb]:bg-[#dddde5] [&::-webkit-scrollbar-thumb]:rounded-[3px]">
            {/* Your Agent */}
            <div className="mb-0 flex flex-col">
              <div className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-[0.1em] mb-[12px] px-[2px]">Your Agent</div>
              <div className="bg-gradient-to-br from-white to-[#f7f7fa] border border-[#e85d45]/10 rounded-[16px] p-[16px] shadow-[0_3px_16px_rgba(232,93,69,0.05)]">
                <div className="flex items-center gap-[10px] mb-[14px] pb-[12px] border-b border-[#e85d45]/10">
                  <div className="w-[36px] h-[36px] rounded-[10px] bg-gradient-to-br from-[#e85d45] to-[#c73a28] flex items-center justify-center text-white text-[13px] font-bold shadow-[0_3px_10px_rgba(232,93,69,0.25)]">
                    {(username ? username.split('@')[0] : "U").charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-[13px] font-semibold capitalize text-[#2d2d3a]">{username ? username.split('@')[0] : "User"}</div>
                    <div className="text-[11px] text-[#9ca3af]">You</div>
                  </div>
                </div>
                <div className="flex items-center gap-[10px]">
                  <div className="w-[36px] h-[36px] rounded-[10px] bg-gradient-to-br from-[#f5f3f0] to-[#eceae7] flex items-center justify-center text-[16px] shadow-[0_1px_4px_rgba(0,0,0,0.04)]">🤖</div>
                  <div>
                    <div className="text-[13px] font-semibold capitalize text-[#2d2d3a]">{agentName ?? "Agent"}</div>
                    <div className="inline-flex items-center gap-[4px] text-[11px] text-[#10b981] font-medium mt-[2px]">
                      <span className="w-[6px] h-[6px] rounded-full bg-[#10b981] inline-block" />Active
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="h-[1px] w-full bg-[#e5e5ed] my-[18px]" />

            {/* Agent Farm */}
            <div>
              <div className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-[0.1em] mb-[12px] px-[2px]">Agent Farm</div>
              <div className="relative mb-[14px]">
                <div className="absolute left-[12px] top-1/2 -translate-y-1/2 text-[#b5b5c4] pointer-events-none">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                </div>
                <input type="text" placeholder="Search agents or users..." value={agentSearch} onChange={(e) => setAgentSearch(e.target.value)}
                  className="w-full bg-[#f4f4f8] border border-black/5 rounded-[10px] p-[12px_12px_12px_36px] text-[13px] outline-none transition-all duration-200 focus:bg-white focus:border-[#e85d45]/20 focus:shadow-[0_2px_8px_rgba(0,0,0,0.02)]" />
              </div>

              {agentsLoading ? (
                <div className="text-center p-[20px] text-[13px] text-[#b5b5c4]">Loading agents…</div>
              ) : filteredAgents.length === 0 ? (
                <div className="text-center p-[20px] text-[13px] text-[#b5b5c4] bg-white border border-dashed border-[#ececf0] rounded-[12px]">No agents found</div>
              ) : (
                <div className="flex flex-col gap-[4px]">
                  {filteredAgents.map((agent, i) => (
                    <div
                      key={agent.user_id || agent.username || `agent-${i}`}
                      className={`flex items-center gap-[10px] p-[10px_12px] rounded-[12px] cursor-pointer transition-all duration-250 border border-transparent hover:bg-black/5 hover:border-black/5 hover:shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:translate-x-[2px] group ${selectedAgentId === agent.user_id ? "bg-[#e85d45]/5 border-[#e85d45]/10 shadow-[0_2px_12px_rgba(232,93,69,0.06)]" : ""}`}
                      onClick={() => { setSelectedAgentId(selectedAgentId === agent.user_id ? null : agent.user_id); }}
                    >
                      <div className="w-[36px] h-[36px] rounded-[10px] flex items-center justify-center text-white text-[12px] font-bold shrink-0 shadow-[0_2px_8px_rgba(0,0,0,0.12)] bg-gradient-to-br from-[#e85d45] to-[#c73a28] transition-transform duration-200 group-hover:scale-105">
                        {agent.username.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-semibold text-[#2d2d3a]">{agent.username}</div>
                        <div className="text-[11px] text-[#9ca3af] whitespace-nowrap overflow-hidden text-ellipsis">{agent.agent_name ?? "Agent"}</div>
                      </div>
                      <div className={`w-[7px] h-[7px] rounded-full shrink-0 ${agent.agent_alive ? "bg-[#10b981] shadow-[0_0_6px_rgba(16,185,129,0.3)]" : "bg-[#d1d5db]"}`} title={agent.agent_alive ? "online" : "offline"} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ═══ SUBAGENT DRAWER ═══ */}
      {subagentDrawerOpen && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center" onClick={() => setSubagentDrawerOpen(false)}>
          <div className="bg-white rounded-t-[24px] w-full max-w-[500px] max-h-[60vh] overflow-y-auto p-6 shadow-[0_-8px_40px_rgba(0,0,0,0.12)] animate-in slide-in-from-bottom duration-300" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[16px] font-bold text-[#1a1a2e]">Background Tasks</h3>
              <button onClick={() => setSubagentDrawerOpen(false)} className="text-[#b5b5c4] text-[18px] leading-none border-none bg-transparent cursor-pointer">✕</button>
            </div>
            {subagentTasks.length === 0 ? (
              <div className="text-center p-[30px] text-[#b5b5c4] text-[13px]">No background tasks yet.</div>
            ) : (
              <div className="flex flex-col gap-3">
                {subagentTasks.map((t) => (
                  <div key={t.taskId} className="p-[14px_16px] bg-[#f9f9fc] rounded-[14px] border border-[#ececf0]">
                    <div className="flex items-start gap-3">
                      <div className={`w-[8px] h-[8px] rounded-full mt-[5px] shrink-0 ${t.status === "running" ? "bg-[#e85d45] animate-pulse" : t.status === "completed" ? "bg-[#10b981]" : "bg-[#ef4444]"}`} />
                      <div className="flex-1">
                        <div className="text-[13px] font-medium text-[#2d2d3a] mb-1">{t.task}</div>
                        {t.skill && <div className="text-[11px] text-[#9ca3af]">Skill: {t.skill}</div>}
                        {t.resultPreview && <div className="text-[12px] text-[#6b7280] mt-1 italic">{t.resultPreview}</div>}
                        {t.error && <div className="text-[12px] text-[#ef4444] mt-1">{t.error}</div>}
                        {t.elapsedSeconds && <div className="text-[11px] text-[#b5b5c4] mt-1">{t.elapsedSeconds}s elapsed</div>}
                      </div>
                      <span className={`text-[10px] font-bold uppercase tracking-[0.08em] px-2 py-1 rounded-full ${t.status === "running" ? "bg-[#e85d45]/10 text-[#e85d45]" : t.status === "completed" ? "bg-[#10b981]/10 text-[#10b981]" : "bg-[#ef4444]/10 text-[#ef4444]"}`}>
                        {t.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ NOTIFICATION TOASTS ═══ */}
      <NotificationToast notifications={notifications} onDismiss={dismissNotification} />
    </>
  );
}

// ─── Outer wrapper: provides CopilotKit context ───────────────────────────────

export default function DashboardPage() {
  const { userId, token } = useAuth();

  return (
    <CopilotKit
      runtimeUrl="/api/copilotkit"
      agent="afa_agent"
      showDevConsole={false}
      properties={{
        userId: userId ?? "",
        token: token ?? "",
      }}
    >
      <ChatInner />
    </CopilotKit>
  );
}
