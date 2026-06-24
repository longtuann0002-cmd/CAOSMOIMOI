-- =========================================================================
-- CAMLEASE SUPABASE DATABASE SETUP SCHEMA
-- Execute the following SQL commands in your Supabase project's SQL Editor
-- to create the required table and Row-Level Security (RLS) policies.
-- =========================================================================

-- 1. Create table to store application state blocks
CREATE TABLE IF NOT EXISTS camlease_store (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Enable Row-Level Security (RLS) to secure your database
ALTER TABLE camlease_store ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS Policies for the public / anonymous client roles
-- These policies permit read/write sync access for the application clients.
-- If you need private, user-specific partitions, you can customize these.

-- Allow read access to all clients
CREATE POLICY "Allow public read access" 
ON camlease_store 
FOR SELECT 
USING (true);

-- Allow upsert/insert access to all clients
CREATE POLICY "Allow public insert/upsert" 
ON camlease_store 
FOR INSERT 
WITH CHECK (true);

-- Allow update access to all clients
CREATE POLICY "Allow public update" 
ON camlease_store 
FOR UPDATE 
USING (true);

-- Allow delete access (if needed)
CREATE POLICY "Allow public delete" 
ON camlease_store 
FOR DELETE 
USING (true);
