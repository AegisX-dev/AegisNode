'use client';

import React, { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { Activity, ShieldAlert, Cpu, HardDrive, Thermometer, Terminal, Network, RefreshCw, Zap, Circle } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:8080';

interface TelemetryRecord {
  cpu_usage: number;
  ram_usage: number;
  temperature: number;
  status: string;
  timestamp: string;
}

interface NodeInfo {
  id: string;
  os_env: string;
  total_ram: number;
  status: string;
  last_ping: string;
  current_cpu?: number;
  current_ram?: number;
  current_temp?: number;
  is_online?: boolean;
}

interface OffloadEvent {
  id: string;
  origin_node: string;
  target_peer: string;
  process_name: string;
  created_at: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────

function getRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

function getStatusClass(status: string, isOffline: boolean): string {
  if (isOffline) return 'offline';
  switch (status) {
    case 'idle': return 'idle';
    case 'busy': return 'busy';
    case 'critical': return 'critical';
    case 'stabilized': return 'stabilized';
    default: return 'idle';
  }
}

// ── Main Component ───────────────────────────────────────────────────────

export default function Dashboard() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  // Real-time telemetry history for charts (keyed by nodeId)
  const [telemetryHistory, setTelemetryHistory] = useState<Record<string, TelemetryRecord[]>>({});

  // Grid Node state
  const [nodes, setNodes] = useState<NodeInfo[]>([]);
  const [events, setEvents] = useState<OffloadEvent[]>([]);

  // Collaboration Intelligence / Auction logs
  const [auctionLogs, setAuctionLogs] = useState<string[]>([
    '[System] Aegis Grid Controller active. Monitoring subnet for bottlenecks...',
  ]);
  const [isNegotiating, setIsNegotiating] = useState(false);
  const [activeAuctionId, setActiveAuctionId] = useState<string | null>(null);

  const consoleEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll console logs
  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [auctionLogs]);

  // Establish WebSockets and Load initial data
  useEffect(() => {
    console.log(`Connecting to WebSocket: ${WS_URL}`);
    const socketInstance = io(WS_URL);
    setSocket(socketInstance);

    socketInstance.on('connect', () => {
      setConnected(true);
      socketInstance.emit('identify', { is_dashboard: true });
      addLog('[Grid Socket] Connected to central API gateway.');
    });

    socketInstance.on('disconnect', () => {
      setConnected(false);
      addLog('[Grid Socket] Disconnected from central API gateway.');
    });

    // Initial load from backend
    socketInstance.on('initial_status', (data: { active_nodes: NodeInfo[]; recent_events: OffloadEvent[] }) => {
      setNodes(data.active_nodes);
      setEvents(data.recent_events);
      addLog(`[Grid Registry] Discovered ${data.active_nodes.length} registered nodes on subnet.`);
    });

    // Handle telemetry streams
    socketInstance.on('telemetry_relay', (data: {
      node_id: string;
      cpu_usage: number;
      ram_usage: number;
      temperature: number;
      status: string;
      timestamp: string;
    }) => {
      // Update charts history
      setTelemetryHistory(prev => {
        const history = prev[data.node_id] || [];
        const newHistory = [...history, {
          cpu_usage: data.cpu_usage,
          ram_usage: data.ram_usage,
          temperature: data.temperature,
          status: data.status,
          timestamp: new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        }];
        // Limit to last 20 records
        return {
          ...prev,
          [data.node_id]: newHistory.slice(-20),
        };
      });

      // Update Node List status in real-time
      setNodes(prev => prev.map(node => {
        if (node.id === data.node_id) {
          return {
            ...node,
            current_cpu: data.cpu_usage,
            current_ram: data.ram_usage,
            current_temp: data.temperature,
            status: data.status,
            last_ping: new Date().toISOString(),
            is_online: true,
          };
        }
        return node;
      }));
    });

    // COLLABORATIVE INTELLIGENCE: Grid Auction socket event listeners
    socketInstance.on('consensus_negotiating', (data: {
      auction_id: string;
      origin_node_id: string;
      process_name: string;
      estimated_load: number;
      status: string;
    }) => {
      setIsNegotiating(true);
      setActiveAuctionId(data.auction_id);
      addLog(`\n[AUCTION START] Node "${data.origin_node_id}" going CRITICAL.`);
      addLog(`[AUCTION] Initializing Grid consensus for: "${data.process_name}" (${data.estimated_load}GB RAM Required).`);
      addLog(`[AUCTION] Sent bid requests to connected subnet nodes...`);
    });

    socketInstance.on('bid_received', (data: {
      auction_id: string;
      node_id: string;
      stability_score: number;
      current_ram_free: number;
    }) => {
      addLog(`[BID RECEIVED] Peer "${data.node_id}" submitted stability score: ${data.stability_score}% (Free memory: ${data.current_ram_free.toFixed(2)}GB)`);
    });

    socketInstance.on('consensus_reached', (data: {
      auction_id: string;
      winner: string;
      stability_score: number;
      bids: Array<{ node_id: string; stability_score: number }>;
    }) => {
      setIsNegotiating(false);
      addLog(`[CONSENSUS SUCCESS] Resolved via grid voting.`);
      if (data.winner.includes('Local') || data.winner.includes('Backlog')) {
        addLog(`[DECISION] No suitable peer accepted bid. Routed workload to: ${data.winner}`);
      } else {
        addLog(`[DECISION] Routed workload to Peer: "${data.winner}" (Bid Score: ${data.stability_score}%).`);
      }
      addLog(`[AUCTION RESOLVED] Grid stabilized.\n`);

      // Refresh status from API
      fetchGridData();
    });

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  // Wizard of Oz Simulation State (Triggered by Ctrl+Shift+O or manual click)
  const runWizardOfOzMock = () => {
    setIsNegotiating(true);
    addLog(`\n[WIZARD DEMO OVERRIDE] Manual override activated.`);
    addLog(`[AUCTION START] Node "node_local_host" approaching 92% RAM capacity. Initiating collaborative grid auction...`);

    // Simulate bid request sent
    setTimeout(() => {
      addLog(`[AUCTION] Sent bid requests to 3 active peers.`);
    }, 500);

    // Simulate Node B bid
    setTimeout(() => {
      addLog(`[BID RECEIVED] Peer "node_kamal_sharma" (Laptop-2) submitted stability score: 94% (Free memory: 8.4GB)`);
    }, 1200);

    // Simulate Node C bid
    setTimeout(() => {
      addLog(`[BID RECEIVED] Peer "node_lab_4" (Lab Workstation) submitted stability score: 48% (Free memory: 2.1GB)`);
    }, 1800);

    // Simulate Node D bid
    setTimeout(() => {
      addLog(`[BID RECEIVED] Peer "node_office_server" (Idle Desktop) submitted stability score: 71% (Free memory: 4.5GB)`);
    }, 2100);

    // Resolve auction
    setTimeout(() => {
      setIsNegotiating(false);
      addLog(`[CONSENSUS SUCCESS] Resolved via grid voting.`);
      addLog(`[DECISION] Routed workload to Peer: "node_kamal_sharma" (Highest Stability Score: 94%).`);
      addLog(`[AUCTION RESOLVED] node_local_host status transitioned to: STABILIZED.\n`);

      // Add a mock event to lists
      const mockEvent: OffloadEvent = {
        id: `mock_evt_${Date.now().toString().slice(-4)}`,
        origin_node: 'node_local_host',
        target_peer: 'node_kamal_sharma',
        process_name: 'rustc compilation',
        created_at: new Date().toISOString(),
      };
      setEvents(prev => [mockEvent, ...prev]);

      // Temporary update local node list statuses
      setNodes(prev => prev.map(n => {
        if (n.id === 'node_local_host') {
          return { ...n, status: 'stabilized', current_ram: 45, current_cpu: 28 };
        }
        if (n.id === 'node_kamal_sharma') {
          return { ...n, status: 'busy', current_ram: 68, current_cpu: 75 };
        }
        return n;
      }));
    }, 3000);
  };

  // Keyboard shortcut listener (Ctrl+Shift+O)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'O') {
        e.preventDefault();
        runWizardOfOzMock();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const addLog = (msg: string) => {
    setAuctionLogs(prev => [...prev, `${new Date().toLocaleTimeString()} ${msg}`]);
  };

  const fetchGridData = async () => {
    try {
      const res = await fetch(`${API_URL}/api/nodes/network-status`);
      const data = await res.json();
      setNodes(data.active_nodes);
      setEvents(data.recent_events);
    } catch (err) {
      console.warn('HTTP Fetch Grid Data failed, relying on Socket updates.');
    }
  };

  // Helper to select node for graphing (usually default to the first active node or origin)
  const graphNodeId = nodes.find(n => n.is_online || n.status !== 'offline')?.id || '';
  const chartData = telemetryHistory[graphNodeId] || [];

  // Derive current metric values for stat pills
  const latestTelemetry = chartData[chartData.length - 1];
  const currentCpu = latestTelemetry?.cpu_usage ?? 0;
  const currentRam = latestTelemetry?.ram_usage ?? 0;
  const currentTemp = latestTelemetry?.temperature ?? 0;

  // ── Log line color logic ───────────────────────────────────────────────
  const getLogColor = (log: string): string => {
    if (log.includes('[AUCTION START]') || log.includes('[WIZARD DEMO')) return 'text-neon-red font-semibold';
    if (log.includes('[BID RECEIVED]')) return 'text-neon-amber';
    if (log.includes('[DECISION]') || log.includes('[CONSENSUS SUCCESS]')) return 'text-neon-green font-semibold';
    if (log.includes('[Grid Socket]') || log.includes('[Grid Registry]')) return 'text-neon-teal';
    if (log.includes('[AUCTION RESOLVED]')) return 'text-neon-teal';
    return 'text-text-secondary';
  };

  return (
    <main className="min-h-screen text-foreground select-none relative">
      {/* Scanline Overlay */}
      <div className="scanline" />

      <div className="max-w-[1600px] mx-auto px-6 py-5">

        {/* ═══════════════════ HEADER BAR ═══════════════════ */}
        <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            {/* Logo Mark */}
            <div className="w-10 h-10 rounded-lg bg-neon-teal/10 border border-neon-teal/30 flex items-center justify-center glow-teal">
              <Network size={20} className="text-neon-teal" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold text-foreground tracking-[0.12em] uppercase flex items-center gap-3">
                Aegis Node
                <span className="text-[10px] font-mono font-normal text-text-muted tracking-normal bg-surface-elevated px-2 py-0.5 rounded">
                  v0.1.0-alpha
                </span>
              </h1>
              <p className="text-xs text-text-secondary mt-0.5 font-body">
                Co-Op Predictive Compute Distribution Grid
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Connection Status Badge */}
            <div className={`card-surface px-3 py-2 flex items-center gap-2.5 text-xs font-mono font-medium ${connected ? 'text-neon-teal' : 'text-neon-red'}`}>
              <span className={`status-dot ${connected ? 'status-dot--online' : 'status-dot--offline'}`} />
              {connected ? 'GRID ONLINE' : 'GRID OFFLINE'}
            </div>

            {/* Refresh Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={fetchGridData}
              className="card-surface p-2.5 text-text-secondary hover:text-neon-teal hover:border-neon-teal/30 transition-colors duration-300"
              title="Refresh Registry"
            >
              <RefreshCw size={14} />
            </motion.button>

            {/* Mock Demo Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={runWizardOfOzMock}
              className="card-surface px-4 py-2 text-neon-amber border-neon-amber/30 hover:bg-neon-amber/10 transition-all duration-300 flex items-center gap-2 text-xs font-mono font-medium"
              title="Wizard of Oz Demo Override (Ctrl+Shift+O)"
            >
              <Zap size={13} />
              MOCK DEMO
            </motion.button>
          </div>
        </header>

        {/* ═══════════════════ BENTO GRID LAYOUT ═══════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

          {/* ──── LEFT COLUMN (8 cols): Telemetry + Subnet Table ──── */}
          <section className="lg:col-span-8 flex flex-col gap-5">

            {/* ╔═══ TELEMETRY ANALYTICS CARD ═══╗ */}
            <div className="card-surface p-5 glow-teal">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-display text-sm font-semibold text-foreground uppercase tracking-wider flex items-center gap-2.5">
                  <Activity size={15} className="text-neon-teal" />
                  Live Node Telemetry
                  {graphNodeId && (
                    <span className="font-mono text-[10px] text-text-muted font-normal tracking-normal ml-1">
                      // {graphNodeId}
                    </span>
                  )}
                </h2>

                {/* Stat Pills */}
                {latestTelemetry && (
                  <div className="hidden md:flex items-center gap-2">
                    <div className="stat-pill text-neon-teal">
                      <Cpu size={12} />
                      <span>{currentCpu.toFixed(0)}%</span>
                    </div>
                    <div className="stat-pill text-neon-red">
                      <HardDrive size={12} />
                      <span>{currentRam.toFixed(0)}%</span>
                    </div>
                    <div className="stat-pill text-neon-amber">
                      <Thermometer size={12} />
                      <span>{currentTemp.toFixed(0)}°C</span>
                    </div>
                  </div>
                )}
              </div>

              {chartData.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-text-muted border border-dashed border-border-subtle rounded-md">
                  <Terminal size={28} className="mb-3 opacity-40" />
                  <p className="font-body text-sm text-text-secondary">Waiting for daemon telemetry stream...</p>
                  <p className="font-mono text-[10px] text-text-muted mt-2">
                    Run <span className="text-neon-teal">pnpm start</span> in aegis-cli to begin
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* CPU/RAM Area Chart */}
                  <div className="h-56 bg-background/60 rounded-md p-3 border border-border-subtle">
                    <p className="text-[10px] text-text-muted mb-2 uppercase font-mono font-semibold tracking-wider text-center">
                      Resource Utilization
                    </p>
                    <ResponsiveContainer width="100%" height="88%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="cpuGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#00ADB5" stopOpacity={0.25} />
                            <stop offset="100%" stopColor="#00ADB5" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="ramGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#E06C75" stopOpacity={0.2} />
                            <stop offset="100%" stopColor="#E06C75" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                        <XAxis dataKey="timestamp" stroke="#4A5068" tick={{ fontSize: 9, fontFamily: 'var(--font-mono)' }} />
                        <YAxis stroke="#4A5068" domain={[0, 100]} tick={{ fontSize: 9, fontFamily: 'var(--font-mono)' }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#22262f',
                            borderColor: 'rgba(255,255,255,0.1)',
                            borderRadius: '6px',
                            color: '#E5E9F0',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '11px',
                          }}
                        />
                        <Area type="monotone" dataKey="cpu_usage" name="CPU" stroke="#00ADB5" strokeWidth={2} fill="url(#cpuGradient)" dot={false} activeDot={{ r: 3, strokeWidth: 0 }} />
                        <Area type="monotone" dataKey="ram_usage" name="RAM" stroke="#E06C75" strokeWidth={2} fill="url(#ramGradient)" dot={false} activeDot={{ r: 3, strokeWidth: 0 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Thermal Area Chart */}
                  <div className="h-56 bg-background/60 rounded-md p-3 border border-border-subtle">
                    <p className="text-[10px] text-text-muted mb-2 uppercase font-mono font-semibold tracking-wider text-center">
                      Thermal Limits (°C)
                    </p>
                    <ResponsiveContainer width="100%" height="88%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#E5C07B" stopOpacity={0.2} />
                            <stop offset="100%" stopColor="#E5C07B" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                        <XAxis dataKey="timestamp" stroke="#4A5068" tick={{ fontSize: 9, fontFamily: 'var(--font-mono)' }} />
                        <YAxis stroke="#4A5068" domain={[30, 95]} tick={{ fontSize: 9, fontFamily: 'var(--font-mono)' }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#22262f',
                            borderColor: 'rgba(255,255,255,0.1)',
                            borderRadius: '6px',
                            color: '#E5E9F0',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '11px',
                          }}
                        />
                        <Area type="monotone" dataKey="temperature" name="Temp" stroke="#E5C07B" strokeWidth={2} fill="url(#tempGradient)" dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>

            {/* ╔═══ GRID SUBNET TABLE ═══╗ */}
            <div className="card-surface p-5">
              <h2 className="font-display text-sm font-semibold text-foreground uppercase tracking-wider flex items-center gap-2.5 mb-4">
                <Network size={15} className="text-neon-teal" />
                Discovered Grid Subnet
                <span className="font-mono text-[10px] text-text-muted font-normal tracking-normal">
                  // {nodes.length} nodes
                </span>
              </h2>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-border-subtle">
                      <th className="py-2.5 px-4 text-[10px] text-text-muted uppercase font-mono font-semibold tracking-wider">Node ID</th>
                      <th className="py-2.5 px-4 text-[10px] text-text-muted uppercase font-mono font-semibold tracking-wider">Environment</th>
                      <th className="py-2.5 px-4 text-[10px] text-text-muted uppercase font-mono font-semibold tracking-wider">Total RAM</th>
                      <th className="py-2.5 px-4 text-[10px] text-text-muted uppercase font-mono font-semibold tracking-wider">Live Metrics</th>
                      <th className="py-2.5 px-4 text-[10px] text-text-muted uppercase font-mono font-semibold tracking-wider text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {nodes.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-10 text-center">
                          <div className="flex flex-col items-center gap-2">
                            <Network size={20} className="text-text-muted opacity-40" />
                            <p className="text-sm text-text-secondary">No nodes discovered</p>
                            <p className="text-[10px] text-text-muted font-mono">Start the daemon to register this machine</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      nodes.map((node) => {
                        const isOffline = !node.is_online && node.status === 'offline';
                        const statusClass = getStatusClass(node.status, isOffline);
                        return (
                          <tr key={node.id} className={`node-row node-row--${statusClass}`}>
                            <td className="py-3 px-4">
                              <span className="font-mono text-xs text-foreground font-medium">
                                {node.id}
                              </span>
                              {node.id === graphNodeId && (
                                <span className="ml-2 text-[9px] text-neon-teal font-mono bg-neon-teal/10 px-1.5 py-0.5 rounded">
                                  GRAPHING
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 font-body text-xs text-text-secondary">{node.os_env}</td>
                            <td className="py-3 px-4 font-mono text-xs text-text-secondary">{node.total_ram} GB</td>
                            <td className="py-3 px-4">
                              {isOffline ? (
                                <span className="text-text-muted text-xs">—</span>
                              ) : (
                                <div className="flex gap-4 font-mono text-xs text-text-secondary">
                                  <span className="flex items-center gap-1">
                                    <Cpu size={11} className="text-neon-teal opacity-70" />
                                    {node.current_cpu?.toFixed(0) || '0'}%
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <HardDrive size={11} className="text-neon-red opacity-70" />
                                    {node.current_ram?.toFixed(0) || '0'}%
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Thermometer size={11} className="text-neon-amber opacity-70" />
                                    {node.current_temp?.toFixed(0) || '45'}°C
                                  </span>
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <span className={`badge badge--${statusClass}`}>
                                {isOffline ? 'OFFLINE' : node.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* ──── RIGHT COLUMN (4 cols): Console + Ledger ──── */}
          <section className="lg:col-span-4 flex flex-col gap-5">

            {/* ╔═══ CONSENSUS CONSOLE (Terminal Window) ═══╗ */}
            <div className={`terminal-window ${isNegotiating ? 'negotiation-pulse' : 'glow-teal'}`}>
              {/* Title Bar */}
              <div className="terminal-titlebar">
                <span className="terminal-dot terminal-dot--close" />
                <span className="terminal-dot terminal-dot--minimize" />
                <span className="terminal-dot terminal-dot--maximize" />
                <span className="ml-3 font-mono text-[10px] text-text-muted tracking-wide flex-1">
                  aegis-consensus-gateway
                </span>
                <Terminal size={12} className={`${isNegotiating ? 'text-neon-amber' : 'text-text-muted'} transition-colors`} />
              </div>

              {/* Terminal Body */}
              <div className="terminal-body h-[290px] overflow-y-auto flex flex-col gap-1 scrollbar-thin">
                <AnimatePresence initial={false}>
                  {auctionLogs.map((log, idx) => (
                    <motion.div
                      key={`${idx}-${log.slice(0, 20)}`}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2, ease: 'easeOut' }}
                      className={`${getLogColor(log)} break-all leading-relaxed`}
                    >
                      {log}
                    </motion.div>
                  ))}
                </AnimatePresence>
                {isNegotiating && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-neon-amber font-semibold mt-1"
                  >
                    <span className="opacity-70">$</span> querying subnet nodes for auction consensus... <span className="cursor-blink" />
                  </motion.div>
                )}
                <div ref={consoleEndRef} />
              </div>
            </div>

            {/* ╔═══ OFFLOAD EVENT LEDGER ═══╗ */}
            <div className="card-surface p-5 flex-1 min-h-[300px]">
              <h2 className="font-display text-sm font-semibold text-foreground uppercase tracking-wider flex items-center gap-2.5 mb-4">
                <ShieldAlert size={15} className="text-neon-teal" />
                Offload Ledger
                {events.length > 0 && (
                  <span className="font-mono text-[10px] text-text-muted font-normal tracking-normal">
                    // {events.length} events
                  </span>
                )}
              </h2>

              <div className="flex flex-col gap-2.5 max-h-[340px] overflow-y-auto pr-1">
                {events.length === 0 ? (
                  <div className="text-center py-12 flex flex-col items-center gap-2">
                    <ShieldAlert size={20} className="text-text-muted opacity-30" />
                    <p className="text-sm text-text-secondary">No offload events tracked</p>
                    <p className="text-[10px] font-mono text-text-muted">Events appear when workloads are routed to peers</p>
                  </div>
                ) : (
                  <AnimatePresence initial={false}>
                    {events.map((event, idx) => (
                      <motion.div
                        key={event.id}
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25, delay: idx * 0.05 }}
                        className="bg-background/40 rounded-md p-3.5 border border-border-subtle hover:border-neon-teal/20 transition-all duration-300 group"
                      >
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-mono text-xs text-neon-red font-semibold uppercase">
                            {event.process_name}
                          </span>
                          <span className="font-mono text-[10px] text-text-muted">
                            {getRelativeTime(event.created_at)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 font-mono text-xs">
                          <span className="text-neon-teal">{event.origin_node.slice(0, 18)}</span>
                          <svg width="20" height="10" viewBox="0 0 20 10" className="text-text-muted opacity-50 flex-shrink-0">
                            <path d="M0 5 H16 M12 1 L17 5 L12 9" stroke="currentColor" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          <span className="text-neon-green">{event.target_peer.slice(0, 18)}</span>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
              </div>
            </div>
          </section>

        </div>

        {/* ═══════════════════ FOOTER ═══════════════════ */}
        <footer className="mt-8 pt-4 border-t border-border-subtle flex items-center justify-between">
          <p className="font-mono text-[10px] text-text-muted">
            DevGathering 2K26 · MIET Meerut · AI & ML Track
          </p>
          <p className="font-mono text-[10px] text-text-muted">
            Built with Ollama phi3:mini · 100% Offline Inference
          </p>
        </footer>
      </div>
    </main>
  );
}
