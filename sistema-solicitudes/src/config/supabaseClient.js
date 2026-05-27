import { createClient } from '@supabase/supabase-js'

// REEMPLAZA estas cadenas con los datos reales de tu proyecto de Supabase
const supabaseUrl = 'https://tu-proyecto-id.supabase.co'
const supabaseAnonKey = 'tu-anon-key-larga-aqui'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)