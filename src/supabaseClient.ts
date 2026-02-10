
import { createClient } from '@supabase/supabase-js';

// Configuration from User
const SUPABASE_URL = 'https://rgncndmcugxxucbutumr.supabase.co';
const SUPABASE_KEY = 'sb_publishable_xPWs8FtNppwrY-0BvwWBkg_Fv2LdZmQ';

// Create a single supabase client for interacting with your database
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
