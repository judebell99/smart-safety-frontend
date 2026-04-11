import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// 컴포넌트 전역에서 재사용할 싱글톤 클라이언트 생성
export const supabase = createClient(supabaseUrl, supabaseAnonKey)