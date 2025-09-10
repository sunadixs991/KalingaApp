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

// Add this function to test your Supabase storage setup
const debugSupabaseStorage = async () => {
  try {
    console.log('=== Supabase Storage Debug ===');
    
    // Test connection
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    console.log('List buckets result:', { buckets, listError });
    
    if (listError) {
      console.error('Failed to list buckets:', listError);
      return;
    }
    
    if (!buckets || buckets.length === 0) {
      console.log('No buckets found');
      return;
    }
    
    // Log all bucket details
    buckets.forEach((bucket, index) => {
      console.log(`Bucket ${index + 1}:`, {
        id: bucket.id,
        name: bucket.name,
        public: bucket.public,
        created_at: bucket.created_at,
        updated_at: bucket.updated_at
      });
    });
    
    // Try to access the profile pictures bucket specifically
    const profileBucket = buckets.find(b => 
      b.id === 'profile-pictures' || 
      b.name === 'profile-pictures' ||
      b.id === 'profile_pictures' || 
      b.name === 'profile_pictures'
    );
    
    if (profileBucket) {
      console.log('Found profile bucket:', profileBucket);
      
      // Test listing files in the bucket
      const { data: files, error: filesError } = await supabase.storage
        .from(profileBucket.id || profileBucket.name)
        .list('', { limit: 5 });
        
      console.log('Files in profile bucket:', { files, filesError });
    } else {
      console.log('Profile pictures bucket not found');
      console.log('Available bucket IDs:', buckets.map(b => b.id));
      console.log('Available bucket names:', buckets.map(b => b.name));
    }
    
  } catch (error) {
    console.error('Debug error:', error);
  }
};

// Call this function to debug (add this temporarily in your useEffect)
// debugSupabaseStorage();