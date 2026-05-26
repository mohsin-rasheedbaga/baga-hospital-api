import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

let _supabase: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }
    _supabase = createClient(supabaseUrl, supabaseServiceKey);
  }
  return _supabase;
}

export async function createHospitalUser(
  hospitalId: number,
  username: string,
  password: string,
  hospitalName: string,
  role: string = 'admin'
): Promise<any> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('hospital_users')
    .insert({
      username,
      password,
      full_name: hospitalName,
      role,
      hospital_id: hospitalId,
      hospital_name: hospitalName,
      is_active: true,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}
