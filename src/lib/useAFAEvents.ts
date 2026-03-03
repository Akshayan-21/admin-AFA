"use client";

/**
 * useAFAEvents: consumes AG-UI CUSTOM events emitted by the AFA Gateway.
 *
 * The backend emits these event names:
 *   afa.rpc_out        — my agent is calling another agent
 *   afa.rpc_in         — reply received from a remote agent
 *   afa.subagent_spawned   — background task started
 *   afa.subagent_completed — background task done
 *   afa.subagent_failed    — background task failed
 *   afa.notification   — scheduled reminder / alert
 *
 * Usage: call this hook inside a <CopilotKit> provider. The hook
 * registers CopilotKit action handlers for each CUSTOM event type
 * and exposes typed state arrays.
 */

import { useState, useCallback } from "react";
import { useCopilotAction } from "@copilotkit/react-core";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RpcMessage {
  from: string;
  text: string;
  time: string;
}

export interface RpcConversation {
  rpcId: string;
  toUsername: string;
  fromUsername: string;
  agentName: string;
  messages: RpcMessage[];
  isTyping: boolean;
  timestamp: number;
}

export interface SubagentTask {
  taskId: string;
  task: string;
  skill?: string;
  status: "running" | "completed" | "failed";
  resultPreview?: string;
  error?: string;
  elapsedSeconds?: number;
  spawnedAt: number;
}

export interface AFANotification {
  id: string;
  title: string;
  body: string;
  timestamp: number;
}

export interface AFAEventsState {
  rpcConversations: RpcConversation[];
  subagentTasks: SubagentTask[];
  notifications: AFANotification[];
  dismissNotification: (id: string) => void;
  activeSubagentCount: number;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAFAEvents(): AFAEventsState {
  const [rpcConversations, setRpcConversations] = useState<RpcConversation[]>([]);
  const [subagentTasks, setSubagentTasks] = useState<SubagentTask[]>([]);
  const [notifications, setNotifications] = useState<AFANotification[]>([]);

  const dismissNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  // ── afa.rpc_out: my agent is contacting another agent ──────────────────────
  useCopilotAction({
    name: "afa.rpc_out",
    parameters: [
      { name: "to", type: "string", description: "Target username" },
      { name: "agent_name", type: "string", description: "Agent name" },
      { name: "message", type: "string", description: "Message sent" },
      { name: "rpc_id", type: "string", description: "RPC call ID" },
    ],
    handler: async ({ to, agent_name, message, rpc_id }) => {
      setRpcConversations((prev) => {
        const existing = prev.find((c) => c.rpcId === rpc_id);
        const msg: RpcMessage = {
          from: agent_name,
          text: message,
          time: "Just now",
        };
        if (existing) {
          return prev.map((c) =>
            c.rpcId === rpc_id
              ? { ...c, messages: [...c.messages, msg], isTyping: true }
              : c
          );
        }
        return [
          ...prev,
          {
            rpcId: rpc_id,
            toUsername: to,
            fromUsername: agent_name,
            agentName: agent_name,
            messages: [msg],
            isTyping: true,
            timestamp: Date.now(),
          },
        ];
      });
    },
  });

  // ── afa.rpc_in: reply received from remote agent ───────────────────────────
  useCopilotAction({
    name: "afa.rpc_in",
    parameters: [
      { name: "from", type: "string", description: "Source username" },
      { name: "agent_name", type: "string", description: "Source agent name" },
      { name: "reply", type: "string", description: "Reply content" },
      { name: "rpc_id", type: "string", description: "RPC call ID" },
    ],
    handler: async ({ from, agent_name, reply, rpc_id }) => {
      setRpcConversations((prev) =>
        prev.map((c) => {
          if (c.rpcId !== rpc_id) return c;
          return {
            ...c,
            isTyping: false,
            messages: [
              ...c.messages,
              { from: from || agent_name, text: reply, time: "Just now" },
            ],
          };
        })
      );
    },
  });

  // ── afa.subagent_spawned ───────────────────────────────────────────────────
  useCopilotAction({
    name: "afa.subagent_spawned",
    parameters: [
      { name: "task_id", type: "string", description: "Task ID" },
      { name: "task", type: "string", description: "Task description" },
      { name: "skill", type: "string", description: "Skill used" },
    ],
    handler: async ({ task_id, task, skill }) => {
      setSubagentTasks((prev) => [
        ...prev.filter((t) => t.taskId !== task_id),
        {
          taskId: task_id,
          task,
          skill,
          status: "running",
          spawnedAt: Date.now(),
        },
      ]);
    },
  });

  // ── afa.subagent_completed ─────────────────────────────────────────────────
  useCopilotAction({
    name: "afa.subagent_completed",
    parameters: [
      { name: "task_id", type: "string", description: "Task ID" },
      { name: "task", type: "string", description: "Task description" },
      { name: "result_preview", type: "string", description: "Result preview" },
      { name: "elapsed_seconds", type: "number", description: "Elapsed seconds" },
    ],
    handler: async ({ task_id, result_preview, elapsed_seconds }) => {
      setSubagentTasks((prev) =>
        prev.map((t) =>
          t.taskId === task_id
            ? { ...t, status: "completed", resultPreview: result_preview, elapsedSeconds: elapsed_seconds }
            : t
        )
      );
    },
  });

  // ── afa.subagent_failed ────────────────────────────────────────────────────
  useCopilotAction({
    name: "afa.subagent_failed",
    parameters: [
      { name: "task_id", type: "string", description: "Task ID" },
      { name: "task", type: "string", description: "Task description" },
      { name: "error", type: "string", description: "Error message" },
    ],
    handler: async ({ task_id, error }) => {
      setSubagentTasks((prev) =>
        prev.map((t) =>
          t.taskId === task_id ? { ...t, status: "failed", error } : t
        )
      );
    },
  });

  // ── afa.notification ───────────────────────────────────────────────────────
  useCopilotAction({
    name: "afa.notification",
    parameters: [
      { name: "title", type: "string", description: "Notification title" },
      { name: "body", type: "string", description: "Notification body" },
    ],
    handler: async ({ title, body }) => {
      const id = `notif_${Date.now()}`;
      setNotifications((prev) => [
        ...prev,
        { id, title, body, timestamp: Date.now() },
      ]);
      // Auto-dismiss after 6 seconds
      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
      }, 6000);
    },
  });

  const activeSubagentCount = subagentTasks.filter(
    (t) => t.status === "running"
  ).length;

  return {
    rpcConversations,
    subagentTasks,
    notifications,
    dismissNotification,
    activeSubagentCount,
  };
}
