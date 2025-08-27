import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://epqnqwfemqbkwlbonmog.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVwcW5xd2ZlbXFia3dsYm9ubW9nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxMzkxNzcsImV4cCI6MjA3MTcxNTE3N30.DINXQg9MP4LT3w2rNI0TYMZYpmE5nYyppIEk1ami7ns';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Test connection: fetch from your own table (e.g., 'pins')
(async () => {
  const { data, error } = await supabase.from('pins').select('*').limit(1);
  if (error) {
    console.log('Supabase connection error:', error.message);
  } else {
    console.log('Supabase is working! Example data:', data);
  }
})();