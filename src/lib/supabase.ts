import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase credentials not found in environment variables. CDN uploads will fail.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Uploads a file to the 'bmt-public' Supabase Storage bucket 
 * and returns its public CDN URL.
 */
export async function uploadFileToCDN(file: File, pathFolder: string = 'uploads'): Promise<string | null> {
  const fileExt = file.name.split('.').pop() || 'png';
  const fileName = `${pathFolder}/${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;

  console.log('Attempting upload to bucket: bmt-public');
  const { data, error } = await supabase.storage
    .from('bmt-public')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) {
    console.error('SUPABASE UPLOAD FAILED:', error);
    return null;
  }

  const { data: publicUrlData } = supabase.storage
    .from('bmt-public')
    .getPublicUrl(fileName);

  return publicUrlData.publicUrl;
}
