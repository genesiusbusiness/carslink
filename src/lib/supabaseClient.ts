import { createClient } from '@supabase/supabase-js'

// Configuration Supabase directement dans le code
const supabaseUrl = 'https://yxkbvhymsvasknslhpsa.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4a2J2aHltc3Zhc2tuc2xocHNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2NzI1MjQsImV4cCI6MjA3NzI0ODUyNH0.zbE1YiXZXDEgpLkRS9XDU8yt4n4EiQItU_YSoEQveTM'
const supabaseServiceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4a2J2aHltc3Zhc2tuc2xocHNhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTY3MjUyNCwiZXhwIjoyMDc3MjQ4NTI0fQ.kn1G0sBMZ0beUbHE3fo1eUv0ZygPAt6adrghVXw9Nac'

// Client public (pour les opérations côté client)
export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
)

// Client admin (uniquement côté serveur - API routes, Server Components)
export const supabaseAdmin = supabaseServiceRoleKey
  ? createClient(
      supabaseUrl,
      supabaseServiceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )
  : null

// ============================================================================
// TYPES POUR LES TABLES SUPABASE - STRUCTURE EXACTE DE LA BASE
// ============================================================================

// 🧩 FLYNESIS CORE
export type FlyAccount = {
  id: string // UUID PRIMARY KEY DEFAULT gen_random_uuid()
  auth_user_id: string // UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE
  email: string // TEXT UNIQUE NOT NULL
  full_name: string | null // TEXT
  first_name: string | null // TEXT
  last_name: string | null // TEXT
  phone: string | null // TEXT
  birth_date: string | null // DATE
  country: string | null // TEXT
  city: string | null // TEXT
  address_line1: string | null // TEXT
  address_line2: string | null // TEXT
  postal_code: string | null // TEXT
  state_province: string | null // TEXT
  role: 'user' | 'business' | 'garage' | 'support' | 'admin' | 'founder' // TEXT DEFAULT 'user'
  created_at: string // TIMESTAMPTZ DEFAULT now()
  updated_at: string // TIMESTAMPTZ DEFAULT now()
}

export type FlyPermission = {
  id: string // UUID PRIMARY KEY DEFAULT gen_random_uuid()
  flyid: string // UUID REFERENCES fly_accounts(id) ON DELETE CASCADE
  can_manage_carslink: boolean // BOOLEAN DEFAULT false
  can_manage_connect: boolean // BOOLEAN DEFAULT false
  can_manage_admin: boolean // BOOLEAN DEFAULT false
  can_manage_business: boolean // BOOLEAN DEFAULT false
}

export type FlyLog = {
  id: string // UUID PRIMARY KEY DEFAULT gen_random_uuid()
  flyid: string // UUID REFERENCES fly_accounts(id) ON DELETE CASCADE
  action: string | null // TEXT
  created_at: string // TIMESTAMPTZ DEFAULT now()
}

// 🚗 CARSLINK ECOSYSTEM
export type CarsLinkClient = {
  id: string // UUID PRIMARY KEY DEFAULT gen_random_uuid()
  flyid: string // UUID REFERENCES fly_accounts(id) ON DELETE CASCADE
  phone: string | null // TEXT
  address: string | null // TEXT
  city: string | null // TEXT
  country: string // TEXT DEFAULT 'France'
  created_at: string // TIMESTAMPTZ DEFAULT now()
}

export type CarsLinkVehicle = {
  id: string // UUID PRIMARY KEY DEFAULT gen_random_uuid()
  client_id: string // UUID REFERENCES carslink_clients(id) ON DELETE CASCADE
  flynesis_user_id: string | null // UUID REFERENCES auth.users(id) ON DELETE CASCADE
  brand: string | null // TEXT
  model: string | null // TEXT
  year: number | null // INT
  license_plate: string | null // TEXT
  vin: string | null // TEXT
  color: string | null // TEXT
  fuel_type: string | null // TEXT ('essence', 'diesel', 'electrique', 'hybride', 'gpl')
  vehicle_type: string | null // TEXT DEFAULT 'voiture'
  mileage: number | null // INT
  created_at: string // TIMESTAMPTZ DEFAULT now()
}

export type CarsLinkGarage = {
  id: string // UUID PRIMARY KEY DEFAULT gen_random_uuid()
  name: string // TEXT NOT NULL
  city: string | null // TEXT
  address: string | null // TEXT
  postal_code: string | null // TEXT
  country: string // TEXT DEFAULT 'France'
  email: string | null // TEXT
  phone: string | null // TEXT
  siret: string | null // TEXT
  owner_id: string | null // UUID REFERENCES fly_accounts(id)
  verified: boolean // BOOLEAN DEFAULT false
  status: string | null // TEXT DEFAULT 'active'
  latitude: number | null // DOUBLE PRECISION
  longitude: number | null // DOUBLE PRECISION
  description: string | null // TEXT
  specialties: string[] | null // TEXT[]
  rating: number | null // NUMERIC
  opening_hours: Record<string, string> | null // JSON object from carslink_garage_opening_hours
  created_at: string // TIMESTAMPTZ DEFAULT now()
}

export type CarsLinkService = {
  id: string // UUID PRIMARY KEY DEFAULT gen_random_uuid()
  garage_id: string // UUID REFERENCES carslink_garages(id) ON DELETE CASCADE
  name: string | null // TEXT
  duration: number | null // INT
  base_price: number | null // NUMERIC(10,2)
  description: string | null // TEXT
}

export type CarsLinkAppointment = {
  id: string // UUID PRIMARY KEY DEFAULT gen_random_uuid()
  flynesis_user_id: string // UUID REFERENCES auth.users(id) ON DELETE CASCADE
  client_id: string | null // UUID REFERENCES carslink_users(id) ON DELETE CASCADE
  vehicle_id: string | null // UUID REFERENCES vehicles(id) ON DELETE CASCADE
  garage_id: string // UUID REFERENCES carslink_garages(id) ON DELETE CASCADE
  service_id: string | null // UUID
  service_type: string | null // TEXT
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' // TEXT DEFAULT 'pending'
  start_time: string | null // TIMESTAMPTZ
  end_time: string | null // TIMESTAMPTZ
  scheduled_at: string | null // TIMESTAMPTZ
  deposit_amount: number | null // NUMERIC(10,2) DEFAULT 0
  deposit_paid: boolean | null // BOOLEAN DEFAULT false
  notes: string | null // TEXT
  created_at: string // TIMESTAMPTZ DEFAULT now()
}

export type CarsLinkBusiness = {
  id: string // UUID PRIMARY KEY DEFAULT gen_random_uuid()
  flyid: string // UUID REFERENCES fly_accounts(id) ON DELETE CASCADE
  company_name: string // TEXT NOT NULL
  siret: string | null // TEXT UNIQUE
  contact_email: string | null // TEXT
  city: string | null // TEXT
  country: string // TEXT DEFAULT 'France'
  created_at: string // TIMESTAMPTZ DEFAULT now()
}

export type CarsLinkProUser = {
  id: string // UUID PRIMARY KEY DEFAULT gen_random_uuid()
  garage_id: string // UUID REFERENCES carslink_garages(id) ON DELETE CASCADE
  email: string | null // TEXT
  full_name: string | null // TEXT
  role: 'mechanic' | 'manager' | 'admin' // TEXT DEFAULT 'mechanic'
  can_edit: boolean // BOOLEAN DEFAULT false
  can_delete: boolean // BOOLEAN DEFAULT false
  created_at: string // TIMESTAMPTZ DEFAULT now()
}

export type CarsLinkSupportTicket = {
  id: string // UUID PRIMARY KEY DEFAULT gen_random_uuid()
  author_id: string | null // UUID REFERENCES fly_accounts(id)
  target_id: string | null // UUID
  target_type: 'garage' | 'client' | 'business' | 'appointment' | 'vehicle' | null // Pas de CHECK dans la DB, mais défini dans les types
  category: 'technical' | 'client' | 'garage' | 'billing' | 'other' | null // TEXT CHECK (category IN (...))
  status: 'open' | 'in_progress' | 'resolved' | 'closed' // TEXT DEFAULT 'open'
  subject: string | null // TEXT
  message: string | null // TEXT
  resolution: string | null // TEXT
  created_at: string // TIMESTAMPTZ DEFAULT now()
  updated_at: string // TIMESTAMPTZ DEFAULT now()
}

