-- Aegis Node: Database Schema Setup Script
-- Paste this script into your Supabase SQL Editor and run it.

-- 1. Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS public.offload_events;
DROP TABLE IF EXISTS public.node_registry;

-- 2. Create node_registry table
CREATE TABLE public.node_registry (
    id TEXT PRIMARY KEY, -- Text-based Node ID (e.g., node_a1b2c3d4)
    os_env TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'idle',
    last_ping TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    total_ram INTEGER NOT NULL DEFAULT 16
);

-- 3. Create offload_events table
CREATE TABLE public.offload_events (
    id TEXT PRIMARY KEY, -- Text-based Auction/Event ID (e.g., auc_12345)
    origin_node TEXT NOT NULL,
    target_peer TEXT NOT NULL,
    process_name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.node_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offload_events ENABLE ROW LEVEL SECURITY;

-- 5. Set up public policies allowing read and write for the demo
CREATE POLICY "Allow public read and write on node_registry" 
ON public.node_registry 
FOR ALL 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Allow public read and write on offload_events" 
ON public.offload_events 
FOR ALL 
USING (true) 
WITH CHECK (true);
