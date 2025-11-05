// ============================================================================
// TYPES POUR LA BASE DE DONNÉES - STRUCTURE EXACTE DE LA BASE
// ============================================================================
// Ce fichier redirige vers les types exacts de supabaseClient.ts
// qui correspondent à la structure réelle de la base de données Supabase
// ============================================================================

// ============================================================================
// TYPES POUR LA BASE DE DONNÉES - STRUCTURE EXACTE DE LA BASE
// ============================================================================
// Ce fichier redirige vers les types exacts de supabaseClient.ts
// qui correspondent à la structure réelle de la base de données Supabase
// ============================================================================

// Import des types exacts de la base de données
import type {
  FlyAccount,
  FlyPermission,
  FlyLog,
  CarsLinkClient,
  CarsLinkVehicle,
  CarsLinkGarage,
  CarsLinkService,
  CarsLinkAppointment,
  CarsLinkBusiness,
  CarsLinkSupportTicket,
  CarsLinkProUser
} from '@/lib/supabaseClient'

// Réexporter les types
export type {
  FlyAccount,
  FlyPermission,
  FlyLog,
  CarsLinkClient,
  CarsLinkVehicle,
  CarsLinkGarage,
  CarsLinkService,
  CarsLinkAppointment,
  CarsLinkBusiness,
  CarsLinkSupportTicket,
  CarsLinkProUser
}

// Alias pour compatibilité avec l'ancien code
export type Profile = CarsLinkClient
export type Garage = CarsLinkGarage
export type Vehicle = CarsLinkVehicle
export type Appointment = CarsLinkAppointment
export type Service = CarsLinkService

// Type pour les factures
export interface Invoice {
  id: string
  flynesis_user_id: string
  appointment_id: string | null
  invoice_number: string | null
  total_amount: number
  tax_amount: number | null
  status: 'paid' | 'pending' | 'refunded' | 'cancelled'
  pdf_url: string | null
  created_at: string
  updated_at: string
  due_date: string | null
  paid_at: string | null
}

// Type pour les notifications
export interface Notification {
  id: string
  flynesis_user_id: string
  title: string
  message: string
  link: string | null
  read: boolean
  created_at: string
}

// Type pour le suivi des réparations
export interface RepairTracking {
  id: string
  appointment_id: string
  status: string | null
  description: string | null
  updated_at: string
  created_at: string
}
