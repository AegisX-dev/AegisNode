# Aegis Node: Predictive Compute Distribution

> **Anticipating system bottlenecks before they crash your workflow.**

Aegis Node is a proactive, localized resource management engine and simulated peer-to-peer compute grid. Built for **DevGathering 2K26**, it shifts the paradigm from reactive monitoring to predictive load balancing using offline, local AI.

---

## 🚀 The Core Innovation

Modern development workflows (Local LLMs, multi-container Docker builds, heavy IDEs) have outpaced standard consumer hardware. **Aegis Node** solves this by:

1.  **Predicting the Crash:** A background daemon feeds real-time hardware telemetry (CPU/RAM/Thermals) into a quantized local ML model (**phi3:mini via Ollama**).
2.  **Privacy-First AI:** Inference runs 100% offline. Your proprietary code and system metrics never leave the host machine.
3.  **Autonomous Offloading:** When a 90%+ probability of memory exhaustion is predicted, the system automatically routes the pending heavy process to an available "idle node" on a localized P2P community network.

---

## 🛠 Repository Structure

This repository contains the three core microservices of the Aegis Node ecosystem:

*   **/aegis-cli**: The "Watcher." A background Node.js/TypeScript daemon that monitors system health and communicates with the AI layer.
*   **/aegis-api**: The "Router." An Express.js mock controller that simulates the P2P grid, manages node registration, and handles offload requests.
*   **/aegis-dashboard**: The "Command Center." A Next.js (App Router) visual analytics dashboard that renders real-time telemetry and network status.

---

## ⚡ Tech Stack

*   **Frontend:** Next.js, TailwindCSS, Recharts, Framer Motion.
*   **Backend:** Node.js, Express.js, Socket.io (Real-time Full-Duplex).
*   **CLI Daemon:** TypeScript, `systeminformation`.
*   **AI/ML:** Ollama (`phi3:mini` time-series forecasting).
*   **Database:** Supabase (PostgreSQL).
*   **Package Manager:** `pnpm`.

---

## 🔧 Installation & Setup

### Prerequisites
*   [Node.js](https://nodejs.org/) (v18+)
*   [pnpm](https://pnpm.io/) (`npm install -g pnpm`)
*   [Ollama](https://ollama.ai/) (Running locally)

### AI Setup
```bash
ollama pull phi3:mini
```

### Running the Ecosystem
1.  **Start the Backend:**
    ```bash
    cd aegis-api && pnpm install && pnpm run dev
    ```
2.  **Start the Dashboard:**
    ```bash
    cd aegis-dashboard && pnpm install && pnpm run dev
    ```
3.  **Launch the CLI Watcher:**
    ```bash
    cd aegis-cli && pnpm install && pnpm start
    ```

---

## 🛡 Security & Privacy
Aegis Node is built on the principle of **Responsible AI**. By leveraging local inference, we ensure that telemetry data remains strictly on the user's hardware. In a future production environment, all P2P tasks will be executed within isolated, secure Docker sandboxes.

---

## 👥 The Team
Built by **Team Aegis** (Dev Sharma & Sambhav Sharma) for **DevGathering 2K26**.
