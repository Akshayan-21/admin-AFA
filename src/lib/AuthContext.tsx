"use client";

/**
 * AuthContext: provides { userId, token, username, agentName, login, logout }
 * to the entire app. Reads from localStorage on mount so session survives refresh.
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import {
  login as authLogin,
  saveSession,
  getSession,
  clearSession,
} from "@/lib/auth";
import { getMyAgent } from "@/lib/gateway";

interface AuthState {
  userId: string | null;
  token: string | null;
  username: string | null;
  /** Resolved agent name from workspace (set after first WS handshake if needed) */
  agentName: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setAgentName: (name: string) => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [agentName, setAgentName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session from localStorage on mount
  useEffect(() => {
    const session = getSession();
    if (session) {
      setUserId(session.userId);
      setToken(session.token);
      setUsername(session.username ?? null);
    }
    setIsLoading(false);
  }, []);

  // Keep agentName up-to-date with backend
  useEffect(() => {
    if (token && userId) {
      getMyAgent(userId, token).then(agent => {
        if (agent) {
          if (agent.agent_name) setAgentName(agent.agent_name);
        }
      }).catch(err => {
        console.error("Failed to load agent name:", err)
      });
    }
  }, [token, userId]);

  const login = useCallback(async (email: string, password: string) => {
    const data = await authLogin(email, password);
    const session = {
      token: data.access_token,
      userId: data.user_id,
      username: data.username,
    };
    saveSession(session);
    setToken(data.access_token);
    setUserId(data.user_id);
    setUsername(data.username ?? null);
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setToken(null);
    setUserId(null);
    setUsername(null);
    setAgentName(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        userId,
        token,
        username,
        agentName,
        isLoading,
        login,
        logout,
        setAgentName,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
