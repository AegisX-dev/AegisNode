# Aegis Node: Predictive Compute Distribution

> **Anticipating system bottlenecks before they crash your workflow.**

Aegis Node is a proactive, localized resource management engine and simulated peer-to-peer compute grid. Built for **DevGathering 2K26**, it shifts the paradigm from reactive monitoring to predictive load balancing using edge-optimized AI.

---

## 🚀 The Core Innovation: Embedded Edge Neural Net

Modern development workflows (Local LLMs, multi-container Docker builds, heavy IDEs) have outpaced standard consumer hardware. **Aegis Node** solves this by:

1.  **Predicting the Crash:** A background daemon feeds real-time hardware telemetry (CPU/RAM/Thermals) into an embedded, feedforward Neural Network (MLP) written in pure TypeScript.
2.  **Ultra-Lightweight Edge AI:** The AI inference runs in `< 1 millisecond` directly inside the Node.js runtime. It has **0% CPU/RAM overhead** and **0 dependencies**, completely replacing heavy 3.8B parameter local LLMs (like Phi-3) and eliminating the need for background Ollama servers.
3.  **Autonomous Offloading:** When a 90%+ probability of memory exhaustion is predicted, the system automatically triggers a grid auction, routing the pending heavy process to an available "idle node" on a localized P2P community network.

---

## 🛠 Repository Structure

This repository contains the core services of the Aegis Node ecosystem:

*   **/aegis-cli**: The "Watcher." A background Node.js/TypeScript daemon that monitors system health and runs the local MLP Neural Network.
*   **/aegis-api**: The "Router." An Express.js grid controller that coordinates the P2P auction, manages node registration, and handles offload routing.
*   **/aegis-dashboard**: The "Command Center." A Next.js (App Router) visual dashboard that renders real-time telemetry, network status, and auction streams.
*   **/aegis-website**: The "Portal." A premium cyber-brutalist landing page for the project featuring an interactive offload simulator.

---

## ⚡ Tech Stack

*   **Frontend & Website:** Next.js (App Router), TailwindCSS, Recharts, Framer Motion.
*   **Backend:** Node.js, Express.js, Socket.io (Real-time Full-Duplex).
*   **CLI Daemon:** TypeScript, `systeminformation`, `socket.io-client`.
*   **AI/ML:** Custom Embedded Feedforward Neural Network (3-Layer MLP with ReLU and Sigmoid activations).
*   **Database:** Supabase (PostgreSQL).

---

## 🔧 Installation & Setup

### Prerequisites
*   [Node.js](https://nodejs.org/) (v18+)
*   [pnpm](https://pnpm.io/) (`npm install -g pnpm`)

### Running the Ecosystem (Host Machine - Laptop A)

A single script is provided to spin up all backend and dashboard services concurrently:

1.  **Launch the Orchestrator:**
    ```bash
    ./start-all.sh
    ```
    *This starts the Express API (port `8080`) and the Next.js Dashboard (port `3000`) in the background, piping logs to the `logs/` directory.*
2.  **Start the Local CLI Watcher:**
    ```bash
    cd aegis-cli && pnpm install && pnpm start
    ```

---

## 🌐 Connecting Peer Nodes (Laptop B - Kamal)

Peers on your local network (e.g., Windows/macOS laptops) can join the grid in seconds:

1.  **Configure Network:**
    *   Connect both laptops to the same Wi-Fi/Mobile Hotspot.
    *   Find Host Laptop A's local IP address (e.g., `10.11.19.162`).
2.  **Configure `.env` on Laptop B:**
    *   Open `aegis-cli/.env` on Laptop B and point it to Laptop A's IP:
        ```env
        API_URL=http://<LAPTOP_A_IP>:8080
        WS_URL=http://<LAPTOP_A_IP>:8080
        POLL_INTERVAL=2000
        ```
3.  **Run Client:**
    *   On Windows, use standard npm to avoid symlink bugs:
        ```powershell
        npm install
        npm start
        ```
    *   *The peer node will instantly connect to Laptop A's grid controller and become visible on the dashboard!*

---

## 👥 The Team
Built by **Team Aegis** (Dev Sharma & Kamal Sharma) for **DevGathering 2K26**.
