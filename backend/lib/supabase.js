// lib/supabase.js
import { createClient } from '@supabase/supabase-js'

// Use environment variables for secure configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://uiovfstvidqidkgoosvj.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpb3Zmc3R2aWRxaWRrZ29vc3ZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUyNjI4ODgsImV4cCI6MjA2MDgzODg4OH0.Cr1__4TbXR34cmB1fQWSP2Q62p6ayV-OrozokVTADcc'

// Fix: Add proper headers and configuration for the Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  global: {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  },
})

// Helper functions for database operations

// Video history operations
export async function getVideoHistory(userId) {
  const { data, error } = await supabase
    .from('videos')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
    
  return { data, error };
}

export async function addVideoToHistory(videoData) {
  const { data, error } = await supabase
    .from('videos')
    .insert([videoData]);
    
  return { data, error };
}

export async function removeVideoFromHistory(videoId) {
  const { data, error } = await supabase
    .from('videos')
    .delete()
    .eq('id', videoId);
    
  return { data, error };
}

export async function clearVideoHistory(userId) {
  const { data, error } = await supabase
    .from('videos')
    .delete()
    .eq('user_id', userId);
    
  return { data, error };
}

// Summary operations
export async function getSummary(videoId) {
  const { data, error } = await supabase
    .from('summaries')
    .select('*')
    .eq('video_id', videoId)
    .single();
    
  return { data, error };
}

export async function saveSummary(summaryData) {
  // Use upsert instead of insert to handle both new and existing records
  const { data, error } = await supabase
    .from('summaries')
    .upsert([summaryData], {
      onConflict: 'video_id', // Specify the conflict column
      ignoreDuplicates: false // Update existing records
    });
    
  if (error) {
    console.error('Error saving summary:', error);
  }
  
  return { data, error };
}

// User preferences operations
export async function getUserPreferences(userId) {
  const { data, error } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', userId)
    .single();
    
  return { data, error };
}

export async function saveUserPreferences(preferencesData) {
  const { data, error } = await supabase
    .from('user_preferences')
    .upsert(preferencesData);
    
  return { data, error };
}

// Add a function to get the current authenticated user
export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error) {
    console.error('Error getting user:', error);
    return { user: null, error };
  }
  
  return { user, error: null };
}

// Add a function to log processing events
export async function logProcessingEvent({ video_id, message, log_type = 'info', user_id = null }) {
  const timestamp = new Date().toISOString();
  
  try {
    const { data, error } = await supabase
      .from('processing_logs')
      .insert([{
        video_id,
        message,
        log_type, // 'info', 'error', 'warning', 'success'
        user_id,
        created_at: timestamp
      }]);
      
    if (error) {
      console.error('Error logging processing event:', error);
      return { data: null, error };
    }
    
    return { data, error: null };
  } catch (err) {
    console.error('Exception logging processing event:', err);
    return { data: null, error: err };
  }
}

// Add a function to get processing logs
export async function getProcessingLogs(videoId, limit = 50) {
  const { data, error } = await supabase
    .from('processing_logs')
    .select('*')
    .eq('video_id', videoId)
    .order('created_at', { ascending: false })
    .limit(limit);
    
  return { data, error };
}
