// Client boundary: all local-preview traffic is blocked before network transport.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { isLocalPreview, isolatedFetch } from '@/lib/localPreview';

const SUPABASE_URL = isLocalPreview ? "https://preview.invalid" : import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = isLocalPreview ? "local-preview-placeholder" : import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  global: { fetch: isolatedFetch(isLocalPreview) },
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: !isLocalPreview,
    ...(isLocalPreview ? { storageKey: "vibeco-preview-auth" } : {}),
  }
});