import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const PORT = process.env.PORT || 8080;
const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// --- Database Configuration (Supabase with Mock Fallback) ---
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
let supabase = null;

if (supabaseUrl && supabaseAnonKey && supabaseUrl !== 'your_supabase_project_url') {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
    console.log('[Aegis API] Supabase Client Initialized.');
  } catch (error) {
    console.error('[Aegis API] Supabase Initialization Failed:', error.message);
  }
} else {
  console.log('[Aegis API] Supabase credentials missing. Falling back to local in-memory store.');
}

// In-Memory Database Fallbacks
const memoryNodeRegistry = new Map();
const memoryOffloadEvents = [];

// Socket registry mapping socketId -> node_id
const activeSockets = new Map();
// Sockets representing UI dashboards
const dashboardSockets = new Set();

// Active auctions tracking: auctionId -> { originNodeId, processName, estimatedLoad, bids: [], resolveCallback }
const activeAuctions = new Map();

// --- HTTP Routes ---

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// A. Node Registration
app.post('/api/nodes/register', async (req, res) => {
  const { node_id, os_type, total_ram, status } = req.body;

  if (!node_id) {
    return res.status(400).json({ error: 'node_id is required' });
  }

  const nodeData = {
    id: node_id,
    os_env: os_type || 'Unknown OS',
    status: status || 'idle',
    last_ping: new Date().toISOString(),
    total_ram: total_ram || 16,
  };

  // Save to Memory
  memoryNodeRegistry.set(node_id, nodeData);

  // Save to Supabase (if available)
  if (supabase) {
    try {
      const { error } = await supabase
        .from('node_registry')
        .upsert(nodeData);

      if (error) {
        console.error('[Aegis API] Supabase Register Error:', error.message);
      }
    } catch (err) {
      console.error('[Aegis API] Supabase Register Catch:', err.message);
    }
  }

  console.log(`[Aegis API] Node Registered: ${node_id} (${os_type})`);
  res.status(200).json({
    success: true,
    token: `aegis-token-${node_id.slice(0, 8)}`,
    message: 'Registered successfully',
  });
});

// B. The P2P Collaborative Offload & Auction Trigger
app.post('/api/workloads/offload', async (req, res) => {
  const { origin_node_id, process_name, estimated_load, crash_probability } = req.body;

  if (!origin_node_id || !process_name) {
    return res.status(400).json({ error: 'origin_node_id and process_name are required' });
  }

  console.log(`[Aegis API] Offload Request: Node ${origin_node_id} predicting crash (${(crash_probability * 100).toFixed(0)}%) for process: "${process_name}"`);

  // Generate unique Auction ID
  const auctionId = `auc_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

  // Find all active socket connections (peers) except the origin node
  const peers = [];
  activeSockets.forEach((nodeId, socketId) => {
    if (nodeId !== origin_node_id) {
      peers.push({ socketId, nodeId });
    }
  });

  // Broadcast "Consensus Negotiating" to UI Dashboards
  broadcastToDashboards('consensus_negotiating', {
    auction_id: auctionId,
    origin_node_id,
    process_name,
    estimated_load,
    status: 'Initializing Collaborative Grid Auction...',
    timestamp: new Date().toISOString(),
  });

  if (peers.length === 0) {
    console.log('[Aegis API] No active peers connected. Falling back to local queue.');
    
    // Simulate fallback target
    const fallbackTarget = 'Local Backlog Queue';
    const mockEvent = {
      id: auctionId,
      origin_node: origin_node_id,
      target_peer: fallbackTarget,
      process_name,
      created_at: new Date().toISOString(),
    };

    memoryOffloadEvents.unshift(mockEvent);
    if (supabase) {
      await supabase.from('offload_events').insert(mockEvent).catch(() => {});
    }

    // Broadcast Consensus Reached
    broadcastToDashboards('consensus_reached', {
      auction_id: auctionId,
      winner: fallbackTarget,
      stability_score: 100,
      bids: [],
      timestamp: new Date().toISOString(),
    });

    return res.status(200).json({
      success: true,
      routed_to_peer: fallbackTarget,
      estimated_time_saved: '15s (local buffer)',
      message: 'No peers online. Task routed to local background queue.',
    });
  }

  // Active Auction setup
  const auctionPromise = new Promise((resolve) => {
    const timeout = setTimeout(() => {
      resolve(resolveAuction(auctionId));
    }, 2500); // Wait 2.5 seconds for all bids

    activeAuctions.set(auctionId, {
      originNodeId: origin_node_id,
      processName: process_name,
      estimatedLoad: estimated_load || 4,
      bids: [],
      timeout,
      resolveCallback: resolve,
    });
  });

  // Broadcast Auction Bid Request to all active peers
  peers.forEach((peer) => {
    io.to(peer.socketId).emit('auction_bid_request', {
      auction_id: auctionId,
      process_name,
      estimated_load: estimated_load || 4,
    });
  });

  console.log(`[Aegis API] Collaborative auction ${auctionId} started. Waiting for bids from ${peers.length} peers...`);

  // Wait for the auction to resolve
  const result = await auctionPromise;
  res.status(200).json(result);
});

// C. Network Status for Dashboard
app.get('/api/nodes/network-status', async (req, res) => {
  let nodes = Array.from(memoryNodeRegistry.values());
  let events = [...memoryOffloadEvents];

  if (supabase) {
    try {
      const { data: dbNodes } = await supabase.from('node_registry').select('*');
      const { data: dbEvents } = await supabase.from('offload_events').select('*').order('created_at', { ascending: false }).limit(20);
      
      if (dbNodes) nodes = dbNodes;
      if (dbEvents) events = dbEvents;
    } catch (err) {
      console.error('[Aegis API] Supabase Network Status Error:', err.message);
    }
  }

  res.status(200).json({
    active_nodes: nodes.map(node => ({
      ...node,
      // Map memory registry statuses for socket liveness
      is_online: Array.from(activeSockets.values()).includes(node.id) || node.status !== 'offline'
    })),
    recent_events: events,
  });
});

// --- Auction Resolution Logic ---
async function resolveAuction(auctionId) {
  const auction = activeAuctions.get(auctionId);
  if (!auction) return { success: false, message: 'Auction not found' };

  activeAuctions.delete(auctionId);
  clearTimeout(auction.timeout);

  const bids = auction.bids;
  console.log(`[Aegis API] Resolving Auction ${auctionId}. Total bids received: ${bids.length}`);

  let winner = null;
  let winningScore = -1;

  if (bids.length > 0) {
    // Sort bids: highest stability score wins
    bids.sort((a, b) => b.stability_score - a.stability_score);
    winner = bids[0];
    winningScore = winner.stability_score;
  }

  let finalTarget = 'Local Host Backup';
  let isPeer = false;

  if (winner) {
    finalTarget = winner.node_id;
    isPeer = true;
  }

  // Save Offload Event
  const offloadEvent = {
    id: auctionId.replace('auc_', ''), // clean UUID or string
    origin_node: auction.originNodeId,
    target_peer: finalTarget,
    process_name: auction.processName,
    created_at: new Date().toISOString(),
  };

  memoryOffloadEvents.unshift(offloadEvent);

  if (supabase) {
    try {
      await supabase.from('offload_events').insert(offloadEvent);
    } catch (err) {
      console.error('[Aegis API] Supabase Event Insert Error:', err.message);
    }
  }

  // Update Peer statuses in registry if needed
  if (isPeer && winner) {
    const peerNode = memoryNodeRegistry.get(winner.node_id);
    if (peerNode) {
      peerNode.status = 'busy';
      if (supabase) {
        await supabase.from('node_registry').update({ status: 'busy' }).eq('id', winner.node_id).catch(() => {});
      }
    }
  }

  // Broadcast results to Dashboards
  broadcastToDashboards('consensus_reached', {
    auction_id: auctionId,
    winner: finalTarget,
    stability_score: winningScore,
    bids: bids,
    timestamp: new Date().toISOString(),
  });

  return {
    success: true,
    routed_to_peer: finalTarget,
    estimated_time_saved: isPeer ? '45s' : '0s',
    message: isPeer ? 'Workload successfully distributed via Collaborative Auction.' : 'No suitable peer accepted bid. Routed to local safe mode.',
  };
}

// --- WebSocket Event Handlers ---
io.on('connection', (socket) => {
  console.log(`[Aegis API] Socket Connected: ${socket.id}`);

  // Node identification
  socket.on('identify', (data) => {
    const { node_id, is_dashboard } = data;
    
    if (is_dashboard) {
      dashboardSockets.add(socket.id);
      console.log(`[Aegis API] Dashboard registered: ${socket.id}`);
      // Send initial network status
      sendInitialStatus(socket);
    } else if (node_id) {
      activeSockets.set(socket.id, node_id);
      console.log(`[Aegis API] CLI Node identified: ${node_id} on socket ${socket.id}`);
      
      // Update memory registry
      const existing = memoryNodeRegistry.get(node_id);
      if (existing) {
        existing.status = 'idle';
      }
    }
  });

  // Relay Telemetry Update from CLI to Dashboard
  socket.on('telemetry_update', (data) => {
    // Add timestamp if missing
    if (!data.timestamp) data.timestamp = new Date().toISOString();
    
    // Update registry in memory
    const nodeId = activeSockets.get(socket.id) || data.node_id;
    if (nodeId) {
      const node = memoryNodeRegistry.get(nodeId);
      if (node) {
        node.current_cpu = data.cpu_usage;
        node.current_ram = data.ram_usage;
        node.current_temp = data.temperature;
        node.last_ping = new Date().toISOString();
      }
    }

    // Broadcast to all dashboard sockets
    broadcastToDashboards('telemetry_relay', data);
  });

  // Receive Bids from CLI Daemons during auction
  socket.on('submit_bid', (bidData) => {
    const { auction_id, node_id, stability_score, current_ram_free } = bidData;
    const auction = activeAuctions.get(auction_id);
    
    if (auction) {
      console.log(`[Aegis API] Bid received from Node ${node_id} for Auction ${auction_id}: Score = ${stability_score}%`);
      
      const bid = {
        node_id,
        stability_score: Number(stability_score) || 0,
        current_ram_free: Number(current_ram_free) || 0,
        timestamp: new Date().toISOString(),
      };

      auction.bids.push(bid);

      // Broadcast bid logs immediately to dashboard for live animation
      broadcastToDashboards('bid_received', {
        auction_id,
        node_id,
        stability_score,
        current_ram_free,
        timestamp: new Date().toISOString(),
      });
    }
  });

  socket.on('disconnect', () => {
    const nodeId = activeSockets.get(socket.id);
    if (nodeId) {
      console.log(`[Aegis API] CLI Node disconnected: ${nodeId}`);
      activeSockets.delete(socket.id);
      
      // Mark as offline in memory
      const node = memoryNodeRegistry.get(nodeId);
      if (node) {
        node.status = 'offline';
      }
    }

    if (dashboardSockets.has(socket.id)) {
      console.log(`[Aegis API] Dashboard disconnected: ${socket.id}`);
      dashboardSockets.delete(socket.id);
    }
  });
});

function broadcastToDashboards(event, data) {
  dashboardSockets.forEach((socketId) => {
    io.to(socketId).emit(event, data);
  });
}

async function sendInitialStatus(socket) {
  let nodes = Array.from(memoryNodeRegistry.values());
  let events = [...memoryOffloadEvents];

  if (supabase) {
    try {
      const { data: dbNodes } = await supabase.from('node_registry').select('*');
      const { data: dbEvents } = await supabase.from('offload_events').select('*').limit(20);
      if (dbNodes) nodes = dbNodes;
      if (dbEvents) events = dbEvents;
    } catch (_) {}
  }

  socket.emit('initial_status', {
    active_nodes: nodes.map(n => ({
      ...n,
      is_online: Array.from(activeSockets.values()).includes(n.id) || n.status !== 'offline'
    })),
    recent_events: events,
  });
}

// Start Server
httpServer.listen(PORT, () => {
  console.log(`[Aegis API] Grid Controller Running on http://localhost:${PORT}`);
});
