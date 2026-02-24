import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || 'https://jgsdibypqzotlkfihzhw.supabase.co';
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impnc2RpYnlwcXpvdGxrZmloemh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5NDE1NDgsImV4cCI6MjA4NzUxNzU0OH0.5K-C_9bWoenxivZ1roxa3ICnLX5edPAxGBG4i-xH6WE';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
