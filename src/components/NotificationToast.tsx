"use client";

/**
 * NotificationToast: displays in-app toast notifications for afa.notification AG-UI events.
 * Renders fixed bottom-right toast stack; each toast auto-dismisses after 6s.
 */

import { useEffect, useState } from "react";
import { AFANotification } from "@/lib/useAFAEvents";

interface Props {
  notifications: AFANotification[];
  onDismiss: (id: string) => void;
}

export default function NotificationToast({ notifications, onDismiss }: Props) {
  if (notifications.length === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: "24px",
        right: "24px",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        maxWidth: "360px",
        pointerEvents: "none",
      }}
    >
      {notifications.map((n) => (
        <Toast key={n.id} notification={n} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function Toast({
  notification,
  onDismiss,
}: {
  notification: AFANotification;
  onDismiss: (id: string) => void;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Trigger slide-in
    const t = setTimeout(() => setVisible(true), 20);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      style={{
        pointerEvents: "all",
        background: "rgba(255,255,255,0.95)",
        backdropFilter: "blur(16px)",
        border: "1px solid rgba(0,0,0,0.06)",
        borderRadius: "16px",
        padding: "16px 18px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.1), 0 2px 8px rgba(0,0,0,0.04)",
        display: "flex",
        gap: "12px",
        alignItems: "flex-start",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(16px)",
        transition: "opacity 0.3s ease, transform 0.3s ease",
      }}
    >
      {/* Bell icon */}
      <div
        style={{
          width: "36px",
          height: "36px",
          borderRadius: "10px",
          background: "linear-gradient(135deg, #e85d45, #c73a28)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          boxShadow: "0 4px 12px rgba(232,93,69,0.2)",
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
      </div>
      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "13px", fontWeight: 600, color: "#1a1a2e", marginBottom: "2px" }}>
          {notification.title}
        </div>
        <div style={{ fontSize: "12px", color: "#6b7280", lineHeight: 1.5 }}>
          {notification.body}
        </div>
      </div>
      {/* Dismiss */}
      <button
        onClick={() => onDismiss(notification.id)}
        style={{
          background: "transparent",
          border: "none",
          cursor: "pointer",
          color: "#9ca3af",
          padding: "2px",
          flexShrink: 0,
          fontSize: "16px",
          lineHeight: 1,
        }}
      >
        ✕
      </button>
    </div>
  );
}
