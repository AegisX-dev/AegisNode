import axios from 'axios';
import { io, Socket } from 'socket.io-client';
import * as si from 'systeminformation';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import chalk from 'chalk';
import dotenv from 'dotenv';

dotenv.config();

// Port configurations
const API_URL = process.env.API_URL || 'http://localhost:8080';
const WS_URL = process.env.WS_URL || 'http://localhost:8080';
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const POLL_INTERVAL = Number(process.env.POLL_INTERVAL) || 2000;
const PREDICTION_INTERVAL = 10000; // run AI prediction every 10s

// Unique Node Identity
const ID_FILE = path.join(__dirname, '..', '.aegis_node_id');
let nodeId: string;

if (fs.existsSync(ID_FILE)) {
  nodeId = fs.readFileSync(ID_FILE, 'utf8').trim();
} else {
  nodeId = `node_${crypto.randomBytes(4).toString('hex')}`;
  fs.writeFileSync(ID_FILE, nodeId, 'utf8');
}

// Telemetry History (rolling 30s window)
interface TelemetryRecord {
  cpu: number;
  ram: number;
  temp: number;
  timestamp: string;
}
const telemetryHistory: TelemetryRecord[] = [];
const HISTORY_LIMIT = 15; // 15 records at 2s interval = 30 seconds

let socket: Socket;
let totalRamGb = 16;
let osType = 'Linux';
let nodeState: 'idle' | 'critical' | 'stabilized' = 'idle';
let statusCooldown = 0; // ignores critical triggers during cooldown after offload

async function init() {
  console.log(chalk.cyan('=================================================='));
  console.log(chalk.cyan(`   AEGIS CLI DAEMON - WATCHER [ID: ${nodeId}]`));
  console.log(chalk.cyan('=================================================='));

  try {
    // Get static system info
    const memInfo = await si.mem();
    totalRamGb = Math.round(memInfo.total / (1024 * 1024 * 1024));
    
    const osInfo = await si.osInfo();
    osType = `${osInfo.distro} ${osInfo.release}`;
  } catch (err) {
    console.error('Failed to query hardware characteristics:', err);
  }

  // Register with Grid Controller
  await registerNode();

  // Connect WebSockets
  setupSocket();

  // Start Telemetry and AI Prediction Loops
  setInterval(collectTelemetry, POLL_INTERVAL);
  setInterval(runAIPrediction, PREDICTION_INTERVAL);
}

// Register Node via HTTP API
async function registerNode() {
  try {
    const res = await axios.post(`${API_URL}/api/nodes/register`, {
      node_id: nodeId,
      os_type: osType,
      total_ram: totalRamGb,
      status: 'idle',
    });
    console.log(chalk.green(`[Aegis CLI] Registered successfully. Token: ${res.data.token}`));
  } catch (err: any) {
    console.warn(chalk.yellow(`[Aegis CLI] Grid API registration failed (${err.message}). Running in offline status.`));
  }
}

// Establish Socket connection
function setupSocket() {
  console.log(`[Aegis CLI] Connecting to Grid Controller Socket: ${WS_URL}`);
  socket = io(WS_URL, {
    reconnectionDelayMax: 10000,
  });

  socket.on('connect', () => {
    console.log(chalk.green('[Aegis CLI] Connected to Grid Controller WebSocket.'));
    // Identify
    socket.emit('identify', { node_id: nodeId, is_dashboard: false });
  });

  socket.on('disconnect', () => {
    console.log(chalk.red('[Aegis CLI] Disconnected from Grid Controller.'));
  });

  // Collaborative Intelligence: Listen to Auction requests
  socket.on('auction_bid_request', async (data: { auction_id: string; process_name: string; estimated_load: number }) => {
    const { auction_id, process_name, estimated_load } = data;
    console.log(chalk.magenta(`[Aegis CLI] Received Grid Bid Request for auction ${auction_id} (Process: "${process_name}", Req Load: ${estimated_load}GB)`));

    if (nodeState !== 'idle') {
      console.log(chalk.yellow(`[Aegis CLI] Bid ignored: Node state is '${nodeState}'`));
      return;
    }

    // Evaluate bid stability score
    const stabilityScore = await evaluateStabilityForWorkload(estimated_load);
    
    // Get free RAM in GB
    const mem = await si.mem();
    const currentRamFreeGb = mem.available / (1024 * 1024 * 1024);

    console.log(chalk.magenta(`[Aegis CLI] Submitting bid: Stability Score = ${stabilityScore}%, Free RAM = ${currentRamFreeGb.toFixed(2)}GB`));
    
    // Submit bid back to controller
    socket.emit('submit_bid', {
      auction_id,
      node_id: nodeId,
      stability_score: stabilityScore,
      current_ram_free: currentRamFreeGb,
    });
  });
}

// Evaluate stability score (Collaborative AI bidding logic)
async function evaluateStabilityForWorkload(workloadGb: number): Promise<number> {
  const currentRecord = telemetryHistory[telemetryHistory.length - 1];
  if (!currentRecord) return 50; // fallback

  const currentRamPct = currentRecord.ram;
  const addedRamPct = (workloadGb / totalRamGb) * 100;
  const projectRamPct = currentRamPct + addedRamPct;

  // Base Stability Formula
  let stabilityScore = 100 - projectRamPct;

  // Adjust score based on CPU load & temperature penalty
  if (currentRecord.cpu > 80) stabilityScore -= 10;
  if (currentRecord.temp > 80) stabilityScore -= 10;

  // Enforce boundary limits [0, 100]
  stabilityScore = Math.max(0, Math.min(100, Math.round(stabilityScore)));

  // Try calling local Ollama for a refined prediction
  try {
    const prompt = `System Specs: Total RAM ${totalRamGb}GB, OS: ${osType}. 
Current Metrics: CPU ${currentRecord.cpu.toFixed(0)}%, RAM ${currentRamPct.toFixed(0)}%, Temp ${currentRecord.temp.toFixed(0)}°C.
Question: If I accept an additional workload of ${workloadGb}GB RAM, what is my predicted system stability score (0 to 100)?
Respond with a single number from 0 to 100. DO NOT write any other text or explanation.`;

    const res = await axios.post(`${OLLAMA_URL}/api/generate`, {
      model: 'phi3:mini',
      prompt: prompt,
      stream: false,
      options: {
        temperature: 0.1,
        num_predict: 5
      }
    }, { timeout: 10000 }); // 10s timeout for quick bids

    const ollamaResponse = res.data.response.trim();
    const parsedScore = parseInt(ollamaResponse.match(/\d+/)?.[0] || '');
    
    if (!isNaN(parsedScore) && parsedScore >= 0 && parsedScore <= 100) {
      console.log(chalk.gray(`[Aegis CLI] Refined Ollama bid score prediction: ${parsedScore}% (Calculated raw: ${stabilityScore}%)`));
      return parsedScore;
    }
  } catch (err: any) {
    // Unresponsive Ollama is expected under high load or missing setup - silent fallback
    console.log(chalk.gray(`[Aegis CLI] Bidding AI query bypassed. Using fallback logic.`));
  }

  return stabilityScore;
}

// Collect Telemetry and Emit via Socket
async function collectTelemetry() {
  try {
    const cpuLoad = await si.currentLoad();
    const cpuTemp = await si.cpuTemperature();
    const mem = await si.mem();

    const cpuUsage = cpuLoad.currentLoad;
    const ramUsage = (mem.active / mem.total) * 100;
    // Temp fallback if sensors are blocked/unsupported
    const temp = cpuTemp.main || 45;

    const record: TelemetryRecord = {
      cpu: cpuUsage,
      ram: ramUsage,
      temp: temp,
      timestamp: new Date().toISOString(),
    };

    // Maintain 30s window
    telemetryHistory.push(record);
    if (telemetryHistory.length > HISTORY_LIMIT) {
      telemetryHistory.shift();
    }

    if (statusCooldown > 0) {
      statusCooldown -= POLL_INTERVAL;
      if (statusCooldown <= 0) {
        nodeState = 'idle';
        console.log(chalk.green('[Aegis CLI] Cooldown elapsed. Resetting node state to IDLE.'));
      }
    }

    // Stream telemetry to Dashboard via API Controller
    if (socket && socket.connected) {
      socket.emit('telemetry_update', {
        node_id: nodeId,
        cpu_usage: cpuUsage,
        ram_usage: ramUsage,
        temperature: temp,
        status: nodeState,
        os_type: osType,
        total_ram: totalRamGb
      });
    }

    // Visual Log Terminal
    const statusColor = nodeState === 'idle' ? chalk.green : nodeState === 'critical' ? chalk.red : chalk.blue;
    console.log(
      `[Telemetry] CPU: ${cpuUsage.toFixed(1)}% | RAM: ${ramUsage.toFixed(1)}% | Temp: ${temp}°C | State: ${statusColor(nodeState.toUpperCase())}`
    );
  } catch (err: any) {
    console.error('[Telemetry Error]', err.message);
  }
}

// Local AI crash forecasting
async function runAIPrediction() {
  if (telemetryHistory.length < 5 || nodeState !== 'idle' || statusCooldown > 0) {
    return;
  }

  console.log(chalk.yellow('[Aegis CLI] Executing local AI crash probability forecasting...'));

  const latestRecord = telemetryHistory[telemetryHistory.length - 1];
  let crashProb = 0.0;

  // Try Ollama prediction first
  try {
    // Generate context summary from rolling telemetry
    const historySummary = telemetryHistory
      .slice(-10)
      .map(h => `CPU:${h.cpu.toFixed(0)}%, RAM:${h.ram.toFixed(0)}%, Temp:${h.temp.toFixed(0)}C`)
      .join(' -> ');

    const prompt = `You are the local Aegis Node OS Crash Forecasting Engine.
Analyze the rolling telemetry logs of this node:
${historySummary}

Specs: Total RAM ${totalRamGb}GB.
Will this node run out of memory or crash within 10 seconds?
Provide your prediction as a JSON object strictly matching this format:
{
  "crash_risk": 0.95,
  "confidence": 0.88,
  "bottleneck": "ram"
}
Do not write anything except the raw JSON object.`;

    const res = await axios.post(`${OLLAMA_URL}/api/generate`, {
      model: 'phi3:mini',
      prompt: prompt,
      stream: false,
      format: 'json',
      options: {
        temperature: 0.2,
        num_predict: 40
      }
    }, { timeout: 25000 }); // 25s timeout for inference

    const text = res.data.response;
    const jsonMatch = text.match(/\{[\s\S]*?\}/);
    if (jsonMatch) {
      const prediction = JSON.parse(jsonMatch[0]);
      crashProb = prediction.crash_risk || 0.0;
      console.log(chalk.blue(`[AI Forecast] Crash Risk: ${(crashProb * 100).toFixed(0)}% | Confidence: ${(prediction.confidence * 100).toFixed(0)}%`));
    }
  } catch (err: any) {
    // Ollama fallback logic
    console.log(chalk.gray(`[AI Forecast] Ollama connection bypassed or timed out. Falling back to local heuristic analyzer.`));
    
    // Fallback: If RAM is trending upward or very high, simulate high crash risk
    if (latestRecord.ram > 88) {
      crashProb = 0.92;
    } else if (latestRecord.ram > 75) {
      crashProb = 0.65;
    } else {
      crashProb = latestRecord.ram / 200; // scale down
    }
    console.log(chalk.gray(`[AI Heuristics] Calculated crash probability: ${(crashProb * 100).toFixed(0)}%`));
  }

  // Handle emergency offload dispatch
  if (crashProb >= 0.85) {
    nodeState = 'critical';
    console.log(chalk.red(`[Aegis CLI] CRITICAL BOTTLENECK DETECTED (Risk: ${(crashProb*100).toFixed(0)}%). INITIALIZING GRID AUCTION...`));
    await triggerOffload(crashProb);
  }
}

// Trigger P2P offload auction
async function triggerOffload(risk: number) {
  try {
    const processNames = ['docker-compose build', 'npm run build', 'ml-training-epochs', 'rustc compilation'];
    const mockProcess = processNames[Math.floor(Math.random() * processNames.length)];
    const workloadRamGb = 4; // simulated RAM requirement

    console.log(chalk.red(`[Aegis CLI] dispatching auction request for process: "${mockProcess}" requiring ${workloadRamGb}GB RAM...`));

    const res = await axios.post(`${API_URL}/api/workloads/offload`, {
      origin_node_id: nodeId,
      process_name: mockProcess,
      estimated_load: workloadRamGb,
      crash_probability: risk,
    });

    if (res.data.success) {
      nodeState = 'stabilized';
      statusCooldown = 15000; // 15 seconds stabilization ignore period
      
      console.log(chalk.green(`[Aegis CLI] GRID COLLABORATION SUCCESS!`));
      console.log(chalk.green(`[Aegis CLI] Routed to Peer Node: ${res.data.routed_to_peer}`));
      console.log(chalk.green(`[Aegis CLI] Estimated Time Saved: ${res.data.estimated_time_saved}`));
      console.log(chalk.green(`[Aegis CLI] Local status transitioned to: STABILIZED`));
    }
  } catch (err: any) {
    console.error(chalk.red(`[Aegis CLI] Grid offload request failed: ${err.message}`));
    nodeState = 'idle'; // reset state
  }
}

init();
