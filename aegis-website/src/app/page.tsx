"use client";

import { useState, useEffect, useCallback, useRef } from "react";

/* ═══════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════ */
type SimState = "safe" | "warn" | "critical" | "stabilized";

interface AuctionBid {
  node: string;
  stability: number;
  latency: string;
  status: "bidding" | "won" | "lost";
}

interface FeatureCard {
  icon: React.ReactNode;
  title: string;
  description: string;
  accentColor: string;
}

interface TeamMember {
  name: string;
  role: string;
  github: string;
  color: string;
}

/* ═══════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════ */
const INSTALL_CMD = "curl -sL https://aegis.node/install | bash";

const AUCTION_PEERS: AuctionBid[] = [
  { node: "node_kamal", stability: 92, latency: "12ms", status: "bidding" },
  { node: "node_arjun", stability: 87, latency: "18ms", status: "bidding" },
  { node: "node_priya", stability: 78, latency: "24ms", status: "bidding" },
];

const FEATURES: FeatureCard[] = [
  {
    icon: <BrainIcon />,
    title: "Offline Inference",
    description:
      "Local crash prediction via Ollama + Phi-3 Mini. Zero data leaves your machine — full privacy, full speed.",
    accentColor: "#00FFAA",
  },
  {
    icon: <AuctionIcon />,
    title: "Consensus Bidding",
    description:
      "Grid auctions coordinate compute offloads in milliseconds. Peer nodes bid stability scores to win tasks.",
    accentColor: "#00E5FF",
  },
  {
    icon: <ShieldIcon />,
    title: "Sandboxed Execution",
    description:
      "Offloaded tasks run in isolated sandboxes. Host integrity is never compromised — even on untrusted peers.",
    accentColor: "#FFB800",
  },
  {
    icon: <DaemonIcon />,
    title: "Proactive Daemon",
    description:
      "Replaces reactive OS monitors. The watcher daemon predicts bottlenecks before they crash your pipeline.",
    accentColor: "#FF3B5C",
  },
];

const TEAM: TeamMember[] = [
  {
    name: "Dev Sharma",
    role: "Full-Stack Engineer",
    github: "https://github.com/devsharma",
    color: "#00FFAA",
  },
  {
    name: "Kamal Sharma",
    role: "Infrastructure & DevOps",
    github: "https://github.com/kamalsharma",
    color: "#00E5FF",
  },
];

/* ═══════════════════════════════════════════════
   PAGE COMPONENT
   ═══════════════════════════════════════════════ */
export default function Home() {
  return (
    <>
      <div className="grid-backdrop" aria-hidden="true" />
      <div className="mesh-gradient" aria-hidden="true" />

      <div className="relative z-10 min-h-screen flex flex-col">
        <Header />
        <main className="flex-1">
          <HeroSection />
          <SimulatorSection />
          <FeaturesSection />
        </main>
        <Footer />
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════
   HEADER
   ═══════════════════════════════════════════════ */
function Header() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      id="site-header"
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-[#0B0B0F]/80 backdrop-blur-xl border-b border-white/5"
          : "bg-transparent"
      }`}
    >
      <nav className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <a href="#" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00FFAA] to-[#00E5FF] flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#0B0B0F"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <span className="font-mono font-bold text-sm tracking-wider text-[#E8E8EC]">
            AEGIS NODE
          </span>
        </a>

        <div className="flex items-center gap-6">
          <a
            href="#simulator"
            className="hidden sm:block text-sm text-[#8A8A96] hover:text-[#00FFAA] transition-colors duration-200"
          >
            Simulator
          </a>
          <a
            href="#features"
            className="hidden sm:block text-sm text-[#8A8A96] hover:text-[#00FFAA] transition-colors duration-200"
          >
            Features
          </a>

          <a
            id="github-link"
            href="https://github.com/aegis-node"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 text-sm text-[#8A8A96] hover:text-[#E8E8EC] hover:border-[#00FFAA]/30 transition-all duration-200"
          >
            <GitHubIcon />
            <span className="hidden sm:inline">GitHub</span>
          </a>

          <a
            id="dashboard-link"
            href="http://localhost:3000"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-[#00FFAA] to-[#00E5FF] text-sm text-[#0B0B0F] font-semibold hover:opacity-90 shadow-glow-green hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
          >
            <span className="w-2 h-2 rounded-full bg-[#0B0B0F] animate-pulse" />
            Dashboard
          </a>
        </div>
      </nav>
    </header>
  );
}

/* ═══════════════════════════════════════════════
   HERO
   ═══════════════════════════════════════════════ */
function HeroSection() {
  const [copied, setCopied] = useState(false);

  const copyCommand = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(INSTALL_CMD);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard API unavailable in some contexts */
    }
  }, []);

  return (
    <section
      id="hero"
      className="relative pt-32 pb-20 px-6 flex flex-col items-center text-center"
    >
      {/* Badge */}
      <div className="animate-fade-in-up mb-8">
        <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#00FFAA]/20 bg-[#00FFAA]/5 text-xs font-mono text-[#00FFAA] tracking-wider">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00FFAA] animate-pulse-glow" />
          DevGathering 2K26 — AI & ML Track
        </span>
      </div>

      {/* Title */}
      <h1 className="animate-fade-in-up stagger-1 max-w-4xl text-4xl sm:text-5xl md:text-6xl font-bold leading-tight tracking-tight text-[#E8E8EC]">
        Offline AI-Powered{" "}
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00FFAA] to-[#00E5FF] glow-green">
          Predictive P2P
        </span>{" "}
        Offloading
      </h1>

      {/* Subtitle */}
      <p className="animate-fade-in-up stagger-2 mt-6 max-w-2xl text-lg text-[#8A8A96] leading-relaxed">
        A proactive daemon that predicts hardware bottlenecks before they crash
        your ML pipeline — and offloads compute to idle peers on your local
        network. 100% offline. Zero data leaks.
      </p>

      {/* Terminal Widget */}
      <div className="animate-fade-in-up stagger-3 mt-12 w-full max-w-xl">
        <div className="terminal border-glow-green">
          <div className="terminal-bar">
            <span className="terminal-dot bg-[#FF5F57]" />
            <span className="terminal-dot bg-[#FEBC2E]" />
            <span className="terminal-dot bg-[#28C840]" />
            <span className="ml-4 text-xs text-[#55556A]">
              ~/aegis-node
            </span>
          </div>
          <button
            id="copy-install-cmd"
            onClick={copyCommand}
            className="w-full text-left px-5 py-4 flex items-center justify-between gap-4 group cursor-pointer hover:bg-white/[0.02] transition-colors duration-200"
            title="Click to copy"
          >
            <div className="flex items-center gap-2 overflow-x-auto">
              <span className="text-[#00FFAA] text-sm shrink-0">$</span>
              <code className="text-sm text-[#E8E8EC] whitespace-nowrap">
                {INSTALL_CMD}
              </code>
            </div>
            <span className="shrink-0 text-[#55556A] group-hover:text-[#00FFAA] transition-colors duration-200">
              {copied ? <CheckIcon /> : <CopyIcon />}
            </span>
          </button>
        </div>
        <p className="mt-3 text-xs text-[#55556A] font-mono">
          {copied ? (
            <span className="text-[#00FFAA]">✓ Copied to clipboard</span>
          ) : (
            "Click to copy install command"
          )}
        </p>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════
   LIVE SIMULATOR
   ═══════════════════════════════════════════════ */
function SimulatorSection() {
  const [load, setLoad] = useState(10);
  const [simState, setSimState] = useState<SimState>("safe");
  const [showAuction, setShowAuction] = useState(false);
  const [auctionBids, setAuctionBids] = useState<AuctionBid[]>([]);
  const [stabilizeMsg, setStabilizeMsg] = useState("");
  const stabilizeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const auctionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback(() => {
    if (stabilizeTimerRef.current) clearTimeout(stabilizeTimerRef.current);
    if (auctionTimerRef.current) clearTimeout(auctionTimerRef.current);
  }, []);

  useEffect(() => {
    return () => clearTimers();
  }, [clearTimers]);

  const handleLoadChange = useCallback(
    (newLoad: number) => {
      setLoad(newLoad);
      clearTimers();

      if (newLoad < 75) {
        setSimState("safe");
        setShowAuction(false);
        setAuctionBids([]);
        setStabilizeMsg("");
      } else if (newLoad <= 85) {
        setSimState("warn");
        setShowAuction(false);
        setAuctionBids([]);
        setStabilizeMsg("");
      } else {
        setSimState("critical");
        setStabilizeMsg("");

        // Start auction sequence
        setShowAuction(true);
        setAuctionBids(
          AUCTION_PEERS.map((p) => ({ ...p, status: "bidding" as const }))
        );

        // After 2s, resolve auction
        auctionTimerRef.current = setTimeout(() => {
          setAuctionBids((prev) =>
            prev.map((bid) => ({
              ...bid,
              status:
                bid.node === "node_kamal"
                  ? ("won" as const)
                  : ("lost" as const),
            }))
          );

          // After 1.5s more, stabilize
          stabilizeTimerRef.current = setTimeout(() => {
            setSimState("stabilized");
            setStabilizeMsg(
              "Offload Successful: Task Relayed to node_kamal. Local RAM Stabilized."
            );
          }, 1500);
        }, 2000);
      }
    },
    [clearTimers]
  );

  const stateConfig = getStateConfig(simState);

  return (
    <section id="simulator" className="py-20 px-6">
      <div className="max-w-4xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-12">
          <span className="inline-block px-3 py-1 rounded-full border border-[#00E5FF]/20 bg-[#00E5FF]/5 text-xs font-mono text-[#00E5FF] tracking-wider mb-4">
            INTERACTIVE DEMO
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#E8E8EC]">
            Live Offload Simulator
          </h2>
          <p className="mt-3 text-[#8A8A96] max-w-lg mx-auto">
            Drag the slider to simulate rising system load. Watch Aegis Node
            predict the crash and orchestrate a P2P offload in real-time.
          </p>
        </div>

        {/* Simulator card */}
        <div
          className={`glass-card p-8 transition-all duration-500 ${
            simState === "safe"
              ? "border-glow-green"
              : simState === "warn"
                ? "border-glow-amber"
                : simState === "critical"
                  ? "border-glow-red"
                  : "border-glow-blue"
          }`}
        >
          {/* Status bar */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div
                className="w-3 h-3 rounded-full animate-pulse-glow"
                style={{ backgroundColor: stateConfig.color }}
              />
              <span
                className="font-mono text-sm font-semibold tracking-wider"
                style={{ color: stateConfig.color }}
              >
                {stateConfig.label}
              </span>
            </div>
            <span className="font-mono text-2xl font-bold text-[#E8E8EC]">
              {load}%
            </span>
          </div>

          {/* Slider */}
          <input
            id="sim-slider"
            type="range"
            min={0}
            max={100}
            value={load}
            onChange={(e) => handleLoadChange(Number(e.target.value))}
            className={`sim-slider state-${simState}`}
            style={{
              background: `linear-gradient(90deg, ${stateConfig.color} 0%, ${stateConfig.color} ${load}%, rgba(255, 255, 255, 0.08) ${load}%, rgba(255, 255, 255, 0.08) 100%)`,
            }}
            aria-label="Simulated System Load"
          />
          <div className="flex justify-between mt-2 text-xs text-[#55556A] font-mono">
            <span>0%</span>
            <span>Simulated CPU / RAM Load</span>
            <span>100%</span>
          </div>

          {/* Telemetry readout */}
          <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <TelemetryCard
              label="CPU"
              value={`${Math.min(load + 3, 100)}%`}
              color={stateConfig.color}
            />
            <TelemetryCard
              label="RAM"
              value={`${Math.min(load + 1, 100)}%`}
              color={stateConfig.color}
            />
            <TelemetryCard
              label="TEMP"
              value={`${52 + Math.round(load * 0.38)}°C`}
              color={stateConfig.color}
            />
            <TelemetryCard
              label="CRASH PROB"
              value={
                load < 75
                  ? "LOW"
                  : load <= 85
                    ? "MEDIUM"
                    : "HIGH"
              }
              color={stateConfig.color}
            />
          </div>

          {/* Auction ticker */}
          {showAuction && (
            <div className="mt-8 border-t border-white/5 pt-6">
              <h3 className="text-xs font-mono text-[#FF3B5C] tracking-wider mb-4 glow-red">
                ⚡ P2P AUCTION — BIDDING FOR OFFLOAD
              </h3>
              <div className="space-y-2">
                {auctionBids.map((bid) => (
                  <div
                    key={bid.node}
                    className="auction-row flex items-center justify-between px-4 py-3 rounded-lg bg-white/[0.02] border border-white/5"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{
                          backgroundColor:
                            bid.status === "won"
                              ? "#00FFAA"
                              : bid.status === "lost"
                                ? "#FF3B5C"
                                : "#FFB800",
                        }}
                      />
                      <span className="font-mono text-sm text-[#E8E8EC]">
                        {bid.node}
                      </span>
                    </div>
                    <div className="flex items-center gap-6 text-xs font-mono">
                      <span className="text-[#8A8A96]">
                        Stability:{" "}
                        <span className="text-[#E8E8EC]">{bid.stability}%</span>
                      </span>
                      <span className="text-[#8A8A96]">
                        Latency:{" "}
                        <span className="text-[#E8E8EC]">{bid.latency}</span>
                      </span>
                      <span
                        className="px-2 py-0.5 rounded text-xs font-semibold"
                        style={{
                          color:
                            bid.status === "won"
                              ? "#00FFAA"
                              : bid.status === "lost"
                                ? "#FF3B5C"
                                : "#FFB800",
                          backgroundColor:
                            bid.status === "won"
                              ? "rgba(0,255,170,0.1)"
                              : bid.status === "lost"
                                ? "rgba(255,59,92,0.1)"
                                : "rgba(255,184,0,0.1)",
                        }}
                      >
                        {bid.status === "won"
                          ? "✓ WON"
                          : bid.status === "lost"
                            ? "✗ LOST"
                            : "BIDDING..."}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Stabilization message */}
          {stabilizeMsg && (
            <div className="mt-6 px-4 py-3 rounded-lg border border-[#3B82F6]/30 bg-[#3B82F6]/5 text-sm font-mono text-[#3B82F6] glow-blue animate-fade-in-up">
              ✓ {stabilizeMsg}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════
   FEATURES
   ═══════════════════════════════════════════════ */
function FeaturesSection() {
  return (
    <section id="features" className="py-20 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <span className="inline-block px-3 py-1 rounded-full border border-[#00FFAA]/20 bg-[#00FFAA]/5 text-xs font-mono text-[#00FFAA] tracking-wider mb-4">
            CAPABILITIES
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#E8E8EC]">
            Built for the Edge
          </h2>
          <p className="mt-3 text-[#8A8A96] max-w-lg mx-auto">
            Every component designed for privacy-first, latency-critical AI
            workloads.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {FEATURES.map((feature, i) => (
            <div
              key={feature.title}
              className={`glass-card p-6 flex flex-col gap-4 animate-fade-in-up stagger-${i + 1}`}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{
                  backgroundColor: `${feature.accentColor}10`,
                  border: `1px solid ${feature.accentColor}25`,
                }}
              >
                <div style={{ color: feature.accentColor }}>
                  {feature.icon}
                </div>
              </div>
              <h3
                className="font-semibold text-lg text-[#E8E8EC]"
                style={{ borderLeft: `2px solid ${feature.accentColor}`, paddingLeft: "12px" }}
              >
                {feature.title}
              </h3>
              <p className="text-sm text-[#8A8A96] leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════
   TEAM
   ═══════════════════════════════════════════════ */
function TeamSection() {
  return (
    <section id="team" className="py-20 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-14">
          <span className="inline-block px-3 py-1 rounded-full border border-[#00E5FF]/20 bg-[#00E5FF]/5 text-xs font-mono text-[#00E5FF] tracking-wider mb-4">
            THE TEAM
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#E8E8EC]">
            Who We Are
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 max-w-2xl mx-auto">
          {TEAM.map((member) => (
            <div key={member.name} className="glass-card p-8 text-center">
              {/* Avatar */}
              <div
                className="w-20 h-20 mx-auto mb-5 rounded-2xl flex items-center justify-center text-2xl font-bold"
                style={{
                  backgroundColor: `${member.color}10`,
                  border: `1px solid ${member.color}30`,
                  color: member.color,
                }}
              >
                {member.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </div>
              <h3 className="text-lg font-semibold text-[#E8E8EC]">
                {member.name}
              </h3>
              <p className="text-sm text-[#8A8A96] mt-1">{member.role}</p>
              <a
                href={member.github}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 mt-5 px-4 py-2 rounded-lg border border-white/10 text-xs font-mono text-[#8A8A96] hover:text-[#E8E8EC] hover:border-white/20 transition-all duration-200"
              >
                <GitHubIcon />
                GitHub
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════
   FOOTER
   ═══════════════════════════════════════════════ */
function Footer() {
  return (
    <footer className="border-t border-white/5 py-8 px-6">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-xs text-[#55556A] font-mono">
          © 2026 Aegis Node — DevGathering 2K26
        </p>
        <p className="text-xs text-[#55556A] font-mono">
          Built with Next.js · 100% Offline AI
        </p>
      </div>
    </footer>
  );
}

/* ═══════════════════════════════════════════════
   TELEMETRY CARD
   ═══════════════════════════════════════════════ */
function TelemetryCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="px-4 py-3 rounded-lg bg-white/[0.02] border border-white/5">
      <p className="text-xs text-[#55556A] font-mono mb-1">{label}</p>
      <p className="text-lg font-mono font-bold" style={{ color }}>
        {value}
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════ */
function getStateConfig(state: SimState): { label: string; color: string } {
  switch (state) {
    case "safe":
      return { label: "NODE STATUS: IDLE / SAFE", color: "#00FFAA" };
    case "warn":
      return { label: "PREDICTING BOTTLENECK...", color: "#FFB800" };
    case "critical":
      return {
        label: "CRITICAL: INITIATING P2P AUCTION...",
        color: "#FF3B5C",
      };
    case "stabilized":
      return { label: "STABILIZED — OFFLOAD COMPLETE", color: "#3B82F6" };
  }
}

/* ═══════════════════════════════════════════════
   SVG ICONS
   ═══════════════════════════════════════════════ */
function GitHubIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#00FFAA"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function BrainIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9.5 2A5.5 5.5 0 005 7.5c0 .59.09 1.16.26 1.69A4.5 4.5 0 003 13.5 4.5 4.5 0 007.5 18H12V2H9.5z" />
      <path d="M14.5 2A5.5 5.5 0 0120 7.5c0 .59-.09 1.16-.26 1.69A4.5 4.5 0 0122 13.5a4.5 4.5 0 01-4.5 4.5H12V2h2.5z" />
      <path d="M12 2v20" />
      <path d="M12 10h-2" />
      <path d="M12 14h2" />
      <path d="M12 18h-2" />
    </svg>
  );
}

function AuctionIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
      <path d="M16 16l2 2" />
      <path d="M8 16l-2 2" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

function DaemonIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="11" width="18" height="10" rx="2" />
      <path d="M7 11V7a5 5 0 0110 0v4" />
      <circle cx="12" cy="16" r="1" />
    </svg>
  );
}
