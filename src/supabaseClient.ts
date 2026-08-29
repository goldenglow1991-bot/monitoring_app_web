import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!url || !publishableKey) {
  throw new Error(
    'VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY が設定されていません(.env.localを確認してください)。',
  );
}

// publishableKey(旧anon key相当)はクライアント側に公開される前提のキーで、
// RLS(行レベルセキュリティ)によってユーザーごとのデータ分離を行う。
export const supabase = createClient(url, publishableKey);
