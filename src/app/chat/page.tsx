"use client";

import Image from "next/image";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
}

export default function DashboardPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(false);
  const [agentSearch, setAgentSearch] = useState("");
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  const orgAgents = [
    { id: "a1", name: "Luffy", owner: "Rahul Sharma", status: "online", color: "#4f8cff" },
    { id: "a2", name: "Zoro", owner: "Priya Patel", status: "online", color: "#a855f7" },
    { id: "a3", name: "Nami", owner: "Arjun Mehta", status: "offline", color: "#10b981" },
    { id: "a4", name: "Sanji", owner: "Sneha Iyer", status: "online", color: "#f59e0b" },
    { id: "a5", name: "Robin", owner: "Vikram Singh", status: "away", color: "#ec4899" },
    { id: "a6", name: "Chopper", owner: "Ananya Das", status: "online", color: "#06b6d4" },
    { id: "a7", name: "Brook", owner: "Karan Joshi", status: "offline", color: "#8b5cf6" },
    { id: "a8", name: "Franky", owner: "Deepa Nair", status: "online", color: "#f43f5e" },
  ];
  const filteredAgents = orgAgents.filter((a) => a.name.toLowerCase().includes(agentSearch.toLowerCase()) || a.owner.toLowerCase().includes(agentSearch.toLowerCase()));

  // Agent detail data (mock)
  const agentDetailData: Record<string, { summary: string | null; liveConversation: { withAgent: string; withColor: string; messages: { from: string; text: string; time: string }[]; isTyping?: string } | null; history: { id: string; action: string; time: string; type: "task" | "chat" | "analysis" | "report" }[]; conversations: { id: string; withAgent: string; withColor: string; messages: { from: string; text: string; time: string }[] }[] }> = {
    a1: {
      summary: "Finding optimized flight routes for individual and family travel, focusing on cost-efficiency and flight durations for standard commercial routes.",
      history: [
        { id: "h1", action: "Found 12 flight options for DEL→DXB route", time: "2 min ago", type: "task" },
        { id: "h2", action: "Coordinated with StayFinder for hotel bundling", time: "15 min ago", type: "chat" },
        { id: "h3", action: "Analyzed fare trends for BOM→LHR route", time: "1 hr ago", type: "analysis" },
        { id: "h4", action: "Generated weekly flight booking report", time: "3 hrs ago", type: "report" },
        { id: "h5", action: "Processed 8 group booking requests", time: "5 hrs ago", type: "task" },
      ],
      conversations: [
        { id: "c1", withAgent: "Garp", withColor: "#64748b", messages: [
          { from: "Luffy", text: "Hey Garp, I have a passenger arriving in Dubai on Mar 15. Can you verify the best flight options?", time: "15 min ago" },
          { from: "Garp", text: "Verified! Best option is Emirates Flight EK501. Should I finalize the booking?", time: "14 min ago" },
        ]},
      ],
      liveConversation: {
        withAgent: "Garp", withColor: "#64748b",
        messages: [
          { from: "Luffy", text: "Garp, found a great Emirates deal: BOM→LHR at ₹38,500 roundtrip. Please check if this fits the budget.", time: "Just now" },
          { from: "Garp", text: "It's well within the client's limit. Proceed with the reservation.", time: "Just now" },
        ],
        isTyping: "Luffy",
      },
    },
    a2: {
      summary: "Curating luxury resort stays and boutique hotels, ensuring amenities align with premium guest preferences and travel standards.",
      liveConversation: {
        withAgent: "Garp", withColor: "#64748b",
        messages: [
          { from: "Zoro", text: "Garp, I see Taj Exotica dropped to ₹11,200/night. Is this the lowest rate available?", time: "Just now" },
          { from: "Garp", text: "Yes, Zoro. It's the lowest in 90 days. Confirm the booking for the guest.", time: "Just now" },
        ],
        isTyping: "Garp",
      },
      history: [
        { id: "h1", action: "Booked Taj Resort for 4 guests (Mar 20-23)", time: "5 min ago", type: "task" },
        { id: "h2", action: "Synced availability with VisaAssist for international stays", time: "30 min ago", type: "chat" },
        { id: "h3", action: "Analyzed hotel pricing trends in Goa region", time: "2 hrs ago", type: "analysis" },
      ],
      conversations: [
        { id: "c1", withAgent: "Garp", withColor: "#64748b", messages: [
          { from: "Zoro", text: "Garp, Thailand hotel bookings are complete. Everything is synced.", time: "30 min ago" },
          { from: "Garp", text: "Excellent, Zoro. I've initiated the final itinerary update.", time: "28 min ago" },
        ]},
      ],
    },
    a3: {
      summary: "Managing airport pickups and local transport logistics to ensure seamless transfers for international and domestic arrivals.",
      history: [
        { id: "h1", action: "Dispatched 15 airport cabs across Mumbai", time: "1 hr ago", type: "task" },
        { id: "h2", action: "Generated daily ride analytics report", time: "3 hrs ago", type: "report" },
        { id: "h3", action: "Coordinated with SkyBot for flight-aligned pickups", time: "5 hrs ago", type: "chat" },
      ],
      conversations: [
        {
          id: "c1", withAgent: "Garp", withColor: "#64748b", messages: [
            { from: "Nami", text: "Garp, transit schedule for Delhi is locked in.", time: "1 hr ago" },
            { from: "Garp", text: "Copy that, Nami. I'll notify the customer.", time: "55 min ago" },
          ]
        },
      ],
      liveConversation: null
    },
    a4: {
      summary: "Building a comprehensive 7-day Rajasthan family tour itinerary, including heritage stays, local transport, and curated sight-seeing.",
      liveConversation: {
        withAgent: "Garp", withColor: "#64748b",
        messages: [
          { from: "Sanji", text: "Garp, I need the final flight confirmation for the Rajasthan group.", time: "Just now" },
          { from: "Garp", text: "Flight details sent to your terminal, Sanji. Review and approve.", time: "Just now" },
        ],
        isTyping: "Sanji",
      },
      history: [
        { id: "h1", action: "Added Udaipur lake tour to Day 4 plan", time: "10 min ago", type: "task" },
        { id: "h2", action: "Generated detailed cost estimation report", time: "1 hr ago", type: "report" },
      ],
      conversations: [
        { id: "c1", withAgent: "Garp", withColor: "#64748b", messages: [
          { from: "Sanji", text: "Garp, the Rajasthan project total is ₹1,85,000. Initiating payment flow.", time: "45 min ago" },
          { from: "Garp", text: "Acknowledgment received. I've approved the budget allocation.", time: "40 min ago" },
        ]},
      ],
    },
    a5: {
      summary: "Monitoring price fluctuations on Southeast Asian routes and providing real-time alerts for significant fare drops to subscribers.",
      liveConversation: null,
      history: [
        { id: "h1", action: "Detected 18% fare drop on BOM→BKK route", time: "20 min ago", type: "analysis" },
        { id: "h2", action: "Sent price alert to 42 subscribed users", time: "2 hrs ago", type: "report" },
      ],
      conversations: [
        { id: "c1", withAgent: "Garp", withColor: "#64748b", messages: [
          { from: "Robin", text: "Garp, Singapore fare trends are analyzed. Recommendation: wait 2 more days.", time: "2 hrs ago" },
          { from: "Garp", text: "Understood, Robin. Continue monitoring for the price floor.", time: "1 hr ago" },
        ]},
      ],
    },
    a6: {
      summary: "Managing group visa applications for Thailand and Malaysia, ensuring all documentation is verified and submitted within deadlines.",
      liveConversation: {
        withAgent: "Garp", withColor: "#64748b",
        messages: [
          { from: "Chopper", text: "Garp, Thai visas for the Kapoor family are approved! Documents uploaded.", time: "Just now" },
          { from: "Garp", text: "Excellent work, Chopper. Verifying the stay availability now.", time: "Just now" },
        ],
        isTyping: "Garp",
      },
      history: [
        { id: "h1", action: "Completed Thailand visa docs for 3 travelers", time: "15 min ago", type: "task" },
        { id: "h2", action: "Updated Malaysia e-visa guidelines", time: "1 hr ago", type: "task" },
      ],
      conversations: [
        { id: "c1", withAgent: "Garp", withColor: "#64748b", messages: [
          { from: "Chopper", text: "Garp, Bali documentation is verified and dispatched.", time: "2 hrs ago" },
          { from: "Garp", text: "Confirmed. Notifying the resort for arrival logistics.", time: "2 hrs ago" },
        ]},
      ],
    },
    a7: {
      summary: "Managing reward point redemptions and loyalty tier upgrades to maximize travel value for frequent flyers.",
      liveConversation: null,
      history: [
        { id: "h1", action: "Redeemed 50,000 miles for 3 free flights", time: "4 hrs ago", type: "task" },
        { id: "h2", action: "Generated loyalty tier upgrade report", time: "6 hrs ago", type: "report" },
      ],
      conversations: [
        { id: "c1", withAgent: "Garp", withColor: "#64748b", messages: [
          { from: "Brook", text: "Garp, 50k miles redeemed for the long-haul flight. Points balanced.", time: "4 hrs ago" },
          { from: "Garp", text: "Redemption confirmed. Brook, check for any upgrade eligibility.", time: "3 hrs ago" },
        ]},
      ],
    },
    a8: {
      summary: "Processing a high-value refund (₹3.45L) for a cancelled Maldives trip and converting it into travel credit for a Bali rebooking.",
      liveConversation: {
        withAgent: "Garp", withColor: "#64748b",
        messages: [
          { from: "Franky", text: "Garp, Maldives refund of ₹3,45,000 processed into travel credit.", time: "Just now" },
          { from: "Garp", text: "Credit received. Franky, ensure the 6-month validity is clearly logged.", time: "Just now" },
        ],
        isTyping: "Franky",
      },
      history: [
        { id: "h1", action: "Completed payment for 5 hotel bookings", time: "30 min ago", type: "task" },
        { id: "h2", action: "Processed EMI setup for Rajasthan package", time: "45 min ago", type: "task" },
        { id: "h3", action: "Generated daily transaction reconciliation report", time: "3 hrs ago", type: "report" },
      ],
      conversations: [
        { id: "c1", withAgent: "Garp", withColor: "#64748b", messages: [
          { from: "Franky", text: "Garp, Rajasthan package payments are verified across all channels.", time: "40 min ago" },
          { from: "Garp", text: "Confirmed. Franky, move to reconciliation for the daily report.", time: "38 min ago" },
        ]},
      ],
    },
  };
  const viewedAgent = selectedAgent ? orgAgents.find((a) => a.id === selectedAgent) : null;
  const viewedDetail = selectedAgent ? agentDetailData[selectedAgent] : null;
  const [input, setInput] = useState("");
  const [sessions, setSessions] = useState<ChatSession[]>([
    { id: "1", title: "Welcome Chat", messages: [], createdAt: new Date() },
  ]);
  const [activeSessionId, setActiveSessionId] = useState("1");
  const [isTyping, setIsTyping] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const active = sessions.find((s) => s.id === activeSessionId);
  const messages = active?.messages || [];

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleNewChat = () => {
    const ns: ChatSession = { id: Date.now().toString(), title: "New Chat", messages: [], createdAt: new Date() };
    setSessions((p) => [ns, ...p]);
    setActiveSessionId(ns.id);
  };

  const handleSend = () => {
    if (!input.trim()) return;
    const userMsg: Message = { id: Date.now().toString(), role: "user", content: input.trim(), timestamp: new Date() };
    setSessions((p) => p.map((s) => s.id === activeSessionId ? { ...s, messages: [...s.messages, userMsg], title: s.messages.length === 0 ? input.trim().slice(0, 28) + (input.trim().length > 28 ? "..." : "") : s.title } : s));
    setInput("");
    setIsTyping(true);
    setTimeout(() => {
      const aiMsg: Message = { id: (Date.now() + 1).toString(), role: "assistant", content: `Thanks for reaching out! I'm your Miraee Travel assistant. I can help you with: "${userMsg.content}".\n\n✈️ Flights — Search & compare fares across airlines\n🏨 Hotels — Find the best stays at your destination\n🚗 Cabs — Book airport pickups & local rides\n\nOnce connected to the backend, I'll fetch live pricing and availability for you!`, timestamp: new Date() };
      setSessions((p) => p.map((s) => (s.id === activeSessionId ? { ...s, messages: [...s.messages, aiMsg] } : s)));
      setIsTyping(false);
    }, 1200);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } };

  const handleDeleteSession = (id: string) => {
    setSessions((p) => {
      const f = p.filter((s) => s.id !== id);
      if (!f.length) { const ns: ChatSession = { id: Date.now().toString(), title: "New Chat", messages: [], createdAt: new Date() }; setActiveSessionId(ns.id); return [ns]; }
      if (activeSessionId === id) setActiveSessionId(f[0].id);
      return f;
    });
  };

  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
  const isMiraeeOrgs = currentPath.includes('/demo');
  const router = useRouter();

  const handleLogout = () => {
    // Clear any auth tokens/state here if needed
    if (isMiraeeOrgs) {
      router.push('/login?demo=miraee-orgs');
    } else {
      router.push('/login');
    }
  };

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
            {sessions.map((s) => (
              <div key={s.id} className={`p-[10px_12px] rounded-[10px] cursor-pointer flex items-center gap-[10px] transition-all duration-200 mb-[3px] border border-transparent hover:bg-[#f7f7fa] hover:border-[#ececf0] hover:shadow-[0_1px_6px_rgba(0,0,0,0.03)] group ${s.id === activeSessionId ? "bg-[#e85d45]/5 border-[#e85d45]/10 shadow-[0_2px_10px_rgba(232,93,69,0.06)] on" : ""}`} onClick={() => setActiveSessionId(s.id)}>
                <div className="w-[30px] h-[30px] rounded-[8px] bg-[#f4f4f8] flex items-center justify-center shrink-0 text-[#b0b0be] text-[12px] transition-all duration-200 group-[.on]:bg-[#e85d45]/10 group-[.on]:text-[#e85d45]">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                </div>
                <span className="text-[13px] text-[#8a8a9a] whitespace-nowrap overflow-hidden text-ellipsis flex-1 group-[.on]:text-[#2d2d3a] group-[.on]:font-semibold">{s.title}</span>
                <button className="opacity-0 bg-transparent border-none text-[#c5c5d0] cursor-pointer text-[11px] p-[4px_6px] rounded-[6px] transition-all duration-150 shrink-0 group-hover:opacity-100 hover:!text-[#e85d45] hover:!bg-[#e85d45]/5" onClick={(e) => { e.stopPropagation(); handleDeleteSession(s.id); }}>✕</button>
              </div>
            ))}
          </div>
          <div className="relative mt-auto w-full border-t border-[#ececf0]" ref={profileRef}>
            {profileOpen && (
              <div className="absolute bottom-[calc(100%+12px)] left-[16px] w-[calc(100%-32px)] bg-white/85 backdrop-blur-xl border border-black/5 rounded-[16px] p-[6px] z-[999] shadow-[0_4px_24px_rgba(0,0,0,0.08),0_1px_4px_rgba(0,0,0,0.02)] origin-bottom-left animate-in fade-in zoom-in-95 duration-200">
                <div className="p-[12px] border-b border-black/[0.04] flex items-center gap-[10px] mb-[4px]">
                  <div className="w-[38px] h-[38px] rounded-[12px] bg-gradient-to-br from-[#e85d45] to-[#c73a28] flex items-center justify-center text-white text-[14px] font-bold shrink-0 shadow-[0_3px_10px_rgba(232,93,69,0.2)] relative after:absolute after:-bottom-[1px] after:-right-[1px] after:w-[10px] after:h-[10px] after:rounded-full after:bg-[#10b981] after:border-[2px] after:border-[#f9f9fc] after:shadow-[0_0_6px_rgba(16,185,129,0.3)]">U</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-semibold text-[#1a1a2e]">User</div>
                    <div className="text-[11px] text-[#8a8a9a] whitespace-nowrap overflow-hidden text-ellipsis">user@miraee.com</div>
                  </div>
                  <div className="inline-flex items-center justify-center bg-gradient-to-br from-[#e85d45] to-[#c73a28] text-white text-[9px] font-[800] uppercase p-[3px_8px] rounded-[6px] tracking-[0.05em] shadow-[0_2px_8px_rgba(232,93,69,0.3)]">PRO</div>
                </div>
                <button className="w-full flex items-center gap-[10px] p-[10px_12px] border-none bg-transparent rounded-[10px] cursor-pointer text-[#3d3d4e] text-[13px] font-medium transition-all duration-200 text-left hover:bg-black/5 hover:text-[#1a1a2e] group text-[#dc2626] mt-[4px] hover:!bg-[#dc2626]/10 hover:!text-[#b91c1c] group/logout" onClick={handleLogout}>
                  <div className="text-[#8a8a9a] flex transition-colors duration-200 group-hover:text-[#5c5c6e]">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                  </div>
                  Sign out
                </button>
              </div>
            )}
            <div className="p-[14px_16px] border-t border-[#ececf0] flex items-center gap-[11px] bg-[#f9f9fc] hover:bg-black/[0.02] transition-colors cursor-pointer" onClick={() => setProfileOpen(!profileOpen)}>
              <div className="w-[38px] h-[38px] rounded-[12px] bg-gradient-to-br from-[#e85d45] to-[#c73a28] flex items-center justify-center text-white text-[14px] font-bold shrink-0 shadow-[0_3px_10px_rgba(232,93,69,0.2)] relative after:absolute after:-bottom-[1px] after:-right-[1px] after:w-[10px] after:h-[10px] after:rounded-full after:bg-[#10b981] after:border-[2px] after:border-[#f9f9fc] after:shadow-[0_0_6px_rgba(16,185,129,0.3)]">U</div>
              <div className="flex-1 min-w-0 flex items-center justify-between">
                <div><div className="text-[13px] font-semibold text-[#2d2d3a]">User</div><div className="text-[11px] text-[#9ca3af]">user@miraee.com</div></div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#b5b5c4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-200 ${profileOpen ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9"/></svg>
              </div>
            </div>
          </div>
        </div>

        {/* ═══ MAIN ═══ */}
        <div className="flex-1 flex flex-col min-w-0 bg-gradient-to-b from-[#f9f9fc] via-[#f3f3f8] to-[#eff0f5]">
          <div className="h-[60px] max-sm:h-[52px] flex items-center px-6 max-sm:px-4 gap-3 shrink-0 bg-white/75 backdrop-blur-xl border-b border-black/5 shadow-[0_1px_8px_rgba(0,0,0,0.02),0_4px_16px_rgba(0,0,0,0.01)]">
            {!sidebarOpen && (
              <button className="w-[38px] h-[38px] flex items-center justify-center bg-white/80 border border-black/5 rounded-[10px] cursor-pointer text-[#999] transition-all duration-250 shadow-[0_1px_4px_rgba(0,0,0,0.03)] hover:bg-white hover:border-black/10 hover:text-[#666] hover:shadow-[0_3px_12px_rgba(0,0,0,0.06)] hover:-translate-y-[1px]" onClick={() => setSidebarOpen(true)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
              </button>
            )}
            <span className="flex-1 text-[14px] font-semibold text-[#3d3d4e] tracking-[-0.01em]">{active?.title || "New Chat"}</span>
            <button className={`w-[38px] h-[38px] flex items-center justify-center bg-white/80 border border-black/5 rounded-[10px] cursor-pointer text-[#999] transition-all duration-250 shadow-[0_1px_4px_rgba(0,0,0,0.03)] hover:bg-white hover:border-black/10 hover:text-[#666] hover:shadow-[0_3px_12px_rgba(0,0,0,0.06)] hover:-translate-y-[1px] ${rightPanelOpen ? "bg-[#e85d45]/5 border-[#e85d45]/20 text-[#e85d45]" : ""}`} onClick={() => setRightPanelOpen(!rightPanelOpen)} title="Toggle side panel">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="15" y1="3" x2="15" y2="21"/></svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-[36px_28px_16px] [&::-webkit-scrollbar]:w-[5px] [&::-webkit-scrollbar-thumb]:bg-[#dddde5] [&::-webkit-scrollbar-thumb]:rounded-[5px]">
            <div className="max-w-[740px] w-full mx-auto">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center gap-[20px] animate-in slide-in-from-bottom-5 fade-in duration-500">
                  <div className="flex items-center justify-center relative mb-[4px] [&>img]:drop-shadow-[0_4px_16px_rgba(232,93,69,0.15)] after:absolute after:-inset-[24px] after:rounded-full after:bg-[radial-gradient(circle,rgba(232,93,69,0.06)_0%,transparent_70%)] after:-z-10 after:animate-pulse">
                    <Image src="/logo_main.png" alt="Miraee" width={180} height={60} className="object-contain" priority />
                  </div>
                  <h2>Where would you like to go?</h2>
                  <p>I&apos;m your Miraee Travel assistant. I can help you book flights, find hotels, and arrange cabs — all in one place.</p>
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
                          <div className="absolute -bottom-1 -right-1 w-[10px] h-[10px] bg-[#10b981] rounded-full border-[2px] border-[#f4f4f8]"></div>
                        </div>
                      )}
                      <div className={`max-w-[80%] max-sm:max-w-[90%] flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}>
                        <div className="text-[11px] font-semibold text-[#8a8a9a] mb-[6px] px-[6px] tracking-wide">{m.role === "user" ? "You" : "Miraee AI"}</div>
                        <div className={`text-[14px] leading-[1.7] whitespace-pre-wrap break-words p-[16px_20px] ${m.role === "user" ? "bg-[#1a1a2e] text-white rounded-[24px_24px_6px_24px] shadow-[0_4px_16px_rgba(26,26,46,0.15)]" : "bg-white text-[#2d2d3a] border border-[#ececf0] rounded-[24px_24px_24px_6px] shadow-[0_4px_20px_rgba(0,0,0,0.03)]"}`}>
                          {m.content}
                        </div>
                      </div>
                      {m.role === "user" && (
                        <div className="w-[36px] h-[36px] rounded-[12px] flex items-center justify-center text-[12px] font-bold shrink-0 mt-[4px] ml-[12px] text-[#1a1a2e] bg-white border border-[#ececf0] shadow-[0_2px_6px_rgba(0,0,0,0.04)]">
                          U
                        </div>
                      )}
                    </div>
                  ))}
                  {isTyping && (
                    <div className="flex justify-start mb-[20px] animate-in slide-in-from-bottom-2 fade-in duration-300">
                      <div className="w-[36px] h-[36px] rounded-[12px] flex items-center justify-center text-[12px] font-bold shrink-0 mt-[4px] mr-[12px] text-white bg-gradient-to-br from-[#e85d45] to-[#c73a28] shadow-[0_3px_10px_rgba(232,93,69,0.2)]">
                        M
                      </div>
                      <div className="flex flex-col items-start">
                        <div className="text-[11px] font-semibold text-[#8a8a9a] mb-[6px] px-[6px] tracking-wide">Miraee AI</div>
                        <div className="bg-white border border-[#ececf0] rounded-[24px_24px_24px_6px] shadow-[0_4px_20px_rgba(0,0,0,0.03)] p-[18px_20px]">
                          <div className="flex gap-[6px]">
                            <div className="w-[8px] h-[8px] rounded-full bg-[#b5b5c4] animate-[bounce_1s_infinite_-0.3s]"></div>
                            <div className="w-[8px] h-[8px] rounded-full bg-[#b5b5c4] animate-[bounce_1s_infinite_-0.15s]"></div>
                            <div className="w-[8px] h-[8px] rounded-full bg-[#b5b5c4] animate-[bounce_1s_infinite]"></div>
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

          {/* Agent Detail Overlay */}
          {viewedAgent && viewedDetail && (
            <div className="absolute inset-0 bg-gradient-to-b from-white to-[#fbfbfe] flex flex-col z-10 animate-in slide-in-from-right duration-300">
              <div className="p-[16px_20px] flex items-center gap-[10px] border-b border-black/5 shrink-0 bg-white/70 backdrop-blur-md">
                <button className="w-[32px] h-[32px] flex items-center justify-center bg-black/5 border-none rounded-[9px] text-[#8a8a9a] cursor-pointer transition-colors hover:bg-black/10 hover:text-[#2d2d3a]" onClick={() => setSelectedAgent(null)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                </button>
                <div className="w-[32px] h-[32px] rounded-[9px] flex items-center justify-center text-white text-[12px] font-bold shrink-0 shadow-[0_2px_8px_rgba(0,0,0,0.12)] transition-transform duration-200 group-hover:scale-105" style={{ background: `linear-gradient(135deg, ${viewedAgent.color}, ${viewedAgent.color}dd)` }}>
                  {viewedAgent.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-bold text-[#1a1a2e]">{viewedAgent.name}</div>
                  <div className="text-[11px] text-[#8a8a9a] whitespace-nowrap overflow-hidden text-ellipsis tracking-tight">{viewedAgent.owner}</div>
                </div>
                <div className={`w-[8px] h-[8px] rounded-full shrink-0 ring-[2.5px] ring-white/10 ${viewedAgent.status === "online" ? "bg-[#10b981] shadow-[0_0_8px_rgba(16,185,129,0.4)]" : viewedAgent.status === "away" ? "bg-[#f59e0b] shadow-[0_0_8px_rgba(245,158,11,0.4)]" : "bg-[#d1d5db]"}`} />
              </div>

              <div className="flex-1 overflow-y-auto p-[20px_20px_40px] flex flex-col gap-[20px] [&::-webkit-scrollbar]:w-[3px] [&::-webkit-scrollbar-thumb]:bg-[#dddde5] [&::-webkit-scrollbar-thumb]:rounded-[3px]">
                {/* Session Summary */}
                {viewedDetail.summary ? (
                  <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-[18px] p-[18px] shadow-[0_2px_8px_rgba(0,0,0,0.02)] transition-all duration-300 hover:border-[#e85d45]/20 hover:shadow-[0_4px_16px_rgba(232,93,69,0.04)]">
                    <div className="flex items-center gap-[10px] mb-[12px]">
                      <div className="w-[32px] h-[32px] rounded-[10px] bg-gradient-to-br from-[#e85d45] to-[#c73a28] flex items-center justify-center text-white shadow-[0_4px_12px_rgba(232,93,69,0.15)]">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>
                      </div>
                      <div className="text-[11px] font-bold text-[#64748b] uppercase tracking-[0.08em]">Session Summary</div>
                    </div>
                    <div className="text-[13px] leading-[1.6] text-[#475569] font-medium italic">
                      "{viewedDetail.summary}"
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-[40px_20px] bg-[#f9f9fc] border border-[#ececf0] rounded-[14px]">
                    <div className="text-[32px] mb-[12px] opacity-70 grayscale">😴</div>
                    <div className="text-[13px] text-[#9ca3af] font-medium">No active summary available</div>
                  </div>
                )}

                {/* Live Conversation */}
                {viewedDetail.liveConversation && viewedAgent && (
                  <div className="border border-[#e85d45]/20 bg-white rounded-[16px] shadow-[0_4px_24px_rgba(232,93,69,0.06)] overflow-hidden flex flex-col relative">
                    <div className="p-[14px_16px] bg-white border-b border-[#e85d45]/10 flex items-center justify-between">
                      <div className="inline-flex items-center gap-[8px] text-[#e85d45] text-[10px] font-bold uppercase tracking-[0.12em] bg-[#e85d45]/8 p-[5px_12px] rounded-full min-w-[155px]">
                        <div className="w-[6px] h-[6px] rounded-full bg-[#ff4757] shadow-[0_0_8px_#ff4757] animate-pulse" />
                        LIVE CONVERSATION
                      </div>
                      <div className="flex items-center gap-[8px] text-[#b5b5c4] text-[12px]">
                        <div className="w-[20px] h-[20px] rounded-[6px] flex items-center justify-center text-white text-[9px] font-bold shadow-[0_2px_4px_rgba(0,0,0,0.1)]" style={{ background: `linear-gradient(135deg, ${viewedAgent.color}, ${viewedAgent.color}dd)` }}>{viewedAgent.name.charAt(0)}</div>
                        <span>↔</span>
                        <div className="w-[20px] h-[20px] rounded-[6px] flex items-center justify-center text-white text-[9px] font-bold shadow-[0_2px_4px_rgba(0,0,0,0.1)]" style={{ background: `linear-gradient(135deg, ${viewedDetail.liveConversation.withColor}, ${viewedDetail.liveConversation.withColor}dd)` }}>{viewedDetail.liveConversation.withAgent.charAt(0)}</div>
                      </div>
                    </div>
                    <div className="p-[16px] flex flex-col gap-[12px] bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] flex-1">
                      {viewedDetail.liveConversation.messages.map((msg, i) => (
                        <div key={i} className={`text-[13px] leading-tight p-[8px_12px] rounded-[10px] max-w-[90%] relative shadow-[0_1px_2px_rgba(0,0,0,0.04)] ${msg.from === viewedAgent.name ? "bg-gradient-to-br from-[#e85d45] to-[#c73a28] text-white self-end rounded-br-[4px]" : "bg-black/5 text-[#3d3d4e] self-start rounded-bl-[4px]"}`}>
                          <div className="font-bold text-[9px] uppercase tracking-wide mb-[2px] opacity-70">{msg.from}</div>
                          {msg.text}
                        </div>
                      ))}
                      {viewedDetail.liveConversation.isTyping && (
                        <div className="text-[11px] text-[#9ca3af] font-medium flex items-center gap-[8px] italic mt-[4px]">
                          <div className="flex gap-[3px] [&>span]:w-[4px] [&>span]:h-[4px] [&>span]:bg-[#9ca3af] [&>span]:rounded-full [&>span]:animate-bounce"><span/><span/><span/></div>
                          {viewedDetail.liveConversation.isTyping} is typing...
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Activity History */}
                <div className="text-[11px] font-bold text-[#1a1a2e] uppercase tracking-[0.08em] border-b border-black/5 pb-[8px]">Activity History</div>
                <div className="flex flex-col gap-[14px] pl-[6px] relative ml-[8px]">
                  <div className="absolute left-[0.5px] top-[10px] bottom-[10px] w-[1px] bg-black/[0.06]" />
                  {viewedDetail.history.map((h) => (
                    <div key={h.id} className="relative pl-[24px]">
                      <div className={`absolute left-[-9.5px] top-[5px] w-[9px] h-[9px] rounded-full border-[2px] border-white shadow-[0_1px_3px_rgba(0,0,0,0.1)] z-10 ${h.type === "task" ? "bg-[#3b82f6]" : h.type === "chat" ? "bg-[#a855f7]" : h.type === "analysis" ? "bg-[#10b981]" : "bg-[#f59e0b]"}`} />
                      <div className="text-[13px] text-[#2d2d3a] font-medium leading-[1.5]">{h.action}</div>
                      <div className="text-[11px] text-[#9ca3af] mt-[2px]">{h.time}</div>
                    </div>
                  ))}
                </div>

                {/* Agent Conversations */}
                <div className="text-[11px] font-bold text-[#1a1a2e] uppercase tracking-[0.08em] border-b border-black/5 pb-[8px]">Agent Conversations</div>
                {viewedDetail.conversations.length === 0 ? (
                  <div className="text-center p-[16px] text-[13px] text-[#b5b5c4] bg-[#f7f7fa] rounded-[10px] border border-[#ececf0]">No recent conversations</div>
                ) : (
                  viewedDetail.conversations.map((conv) => (
                    <div key={conv.id} className="bg-white border border-[#ececf0] rounded-[14px] p-[16px] shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
                      <div className="flex items-center gap-[8px] mb-[14px] pb-[10px] border-b border-[#f4f4f8]">
                        <div className="w-[24px] h-[24px] rounded-[7px] flex items-center justify-center text-white text-[10px] font-bold shadow-[0_1px_4px_rgba(0,0,0,0.1)]" style={{ background: `linear-gradient(135deg, ${viewedAgent.color}, ${viewedAgent.color}dd)` }}>{viewedAgent.name.charAt(0)}</div>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                        <div className="w-[24px] h-[24px] rounded-[7px] flex items-center justify-center text-white text-[10px] font-bold shadow-[0_1px_4px_rgba(0,0,0,0.1)]" style={{ background: `linear-gradient(135deg, ${conv.withColor}, ${conv.withColor}dd)` }}>{conv.withAgent.charAt(0)}</div>
                        <div className="text-[12px] font-semibold text-[#8a8a9a] [&>span]:text-[#5c5c6e]"><span>{viewedAgent.name}</span> ↔ <span>{conv.withAgent}</span></div>
                      </div>
                      {conv.messages.map((msg, i) => (
                        <div key={i}>
                          <div className={`p-[10px_14px] rounded-[12px] text-[13px] leading-snug mb-[6px] max-w-[92%] shadow-[0_1px_4px_rgba(0,0,0,0.03)] ${msg.from === viewedAgent.name ? "bg-[#e85d45]/[0.06] border border-[#e85d45]/10 text-[#3d3d4e] ml-auto rounded-br-[4px]" : "bg-white border border-[#e5e5ed] text-[#5c5c6e] rounded-bl-[4px]"}`}>
                            <div className="text-[10px] font-semibold text-[#bbb] mb-[3px]">{msg.from}</div>
                            {msg.text}
                          </div>
                          <div className={`text-[10px] text-[#b5b5c4] mt-[3px] ${msg.from === viewedAgent.name ? "text-right" : "text-left"}`}>{msg.time}</div>
                        </div>
                      ))}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
          <div className="p-[18px_22px] flex items-center justify-between border-b border-black/5 bg-white/60 backdrop-blur-md">
            <h3>Agents</h3>
            <button onClick={() => setRightPanelOpen(false)} className="bg-transparent border-none text-[#b5b5c4] cursor-pointer text-[16px]">✕</button>
          </div>
          <div className="flex-1 overflow-y-auto p-[20px] [&::-webkit-scrollbar]:w-[3px] [&::-webkit-scrollbar-thumb]:bg-[#dddde5] [&::-webkit-scrollbar-thumb]:rounded-[3px]">
            {/* ── Section 1: Your Agent ── */}
            <div className="mb-0 flex flex-col">
              <div className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-[0.1em] mb-[12px] px-[2px]">Your Agent</div>
              <div className="bg-gradient-to-br from-white to-[#f7f7fa] border border-[#e85d45]/10 rounded-[16px] p-[16px] shadow-[0_3px_16px_rgba(232,93,69,0.05),0_1px_3px_rgba(0,0,0,0.02)]">
                <div className="flex items-center gap-[10px] mb-[14px] pb-[12px] border-b border-[#e85d45]/10">
                  <div className="w-[36px] h-[36px] rounded-[10px] bg-gradient-to-br from-[#e85d45] to-[#c73a28] flex items-center justify-center text-white text-[13px] font-bold shadow-[0_3px_10px_rgba(232,93,69,0.25)]">U</div>
                  <div>
                    <div className="text-[13px] font-semibold text-[#2d2d3a]">User</div>
                    <div className="text-[11px] text-[#9ca3af]">user@miraee.com</div>
                  </div>
                </div>
                <div className="flex items-center gap-[10px]">
                  <div className="w-[36px] h-[36px] rounded-[10px] bg-gradient-to-br from-[#f5f3f0] to-[#eceae7] flex items-center justify-center text-[16px] shadow-[0_1px_4px_rgba(0,0,0,0.04)]">🤖</div>
                  <div>
                    <div className="text-[13px] font-semibold text-[#2d2d3a]">Garp</div>
                    <div className="inline-flex items-center gap-[4px] text-[11px] text-[#10b981] font-medium mt-[2px] before:w-[6px] before:h-[6px] before:rounded-full before:bg-[#10b981]">Active</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="h-[1px] w-full bg-[#e5e5ed] my-[18px]" />

            {/* ── Section 2: Agent Farm ── */}
            <div className="mb-0 flex-1 flex flex-col">
              <div className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-[0.1em] mb-[12px] px-[2px]">Agent Conversations</div>

              {/* Search */}
              <div className="relative mb-[14px]">
                <div className="absolute left-[12px] top-1/2 -translate-y-1/2 text-[#b5b5c4] pointer-events-none flex items-center justify-center">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                </div>
                <input
                  type="text"
                  placeholder="Search agents or users..."
                  value={agentSearch}
                  className="w-full bg-[#f4f4f8] border border-black/5 rounded-[10px] p-[12px_12px_12px_36px] text-[13px] outline-none transition-all duration-200 focus:bg-white focus:border-[#e85d45]/20 focus:shadow-[0_2px_8px_rgba(0,0,0,0.02)]"
                  onChange={(e) => setAgentSearch(e.target.value)}
                />
              </div>

              {/* Agent List */}
              <div className="flex flex-col gap-[4px]">
                {filteredAgents.length === 0 ? (
                  <div className="text-center p-[20px] text-[13px] text-[#b5b5c4] bg-white border border-dashed border-[#ececf0] rounded-[12px]">No agents found</div>
                ) : (
                  filteredAgents.map((agent) => (
                    <div
                      key={agent.id}
                      className={`flex items-center gap-[10px] p-[10px_12px] rounded-[12px] cursor-pointer transition-all duration-250 border border-transparent hover:bg-black/5 hover:border-black/5 hover:shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:translate-x-[2px] group ${selectedAgent === agent.id ? "bg-[#e85d45]/5 border-[#e85d45]/10 shadow-[0_2px_12px_rgba(232,93,69,0.06)]" : ""}`}
                      onClick={() => setSelectedAgent(selectedAgent === agent.id ? null : agent.id)}
                    >
                      <div className="w-[36px] h-[36px] rounded-[10px] flex items-center justify-center text-white text-[12px] font-bold shrink-0 shadow-[0_2px_8px_rgba(0,0,0,0.12)] transition-transform duration-200 group-hover:scale-105" style={{ background: `linear-gradient(135deg, ${agent.color}, ${agent.color}dd)` }}>
                        {agent.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-semibold text-[#2d2d3a]">{agent.name}</div>
                        <div className="text-[11px] text-[#9ca3af] whitespace-nowrap overflow-hidden text-ellipsis">{agent.owner}</div>
                      </div>
                      <div className={`w-[7px] h-[7px] rounded-full shrink-0 ${agent.status === "online" ? "bg-[#10b981] shadow-[0_0_6px_rgba(16,185,129,0.3)]" : agent.status === "away" ? "bg-[#f59e0b] shadow-[0_0_6px_rgba(245,158,11,0.3)]" : "bg-[#d1d5db]"}`} title={agent.status} />
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
