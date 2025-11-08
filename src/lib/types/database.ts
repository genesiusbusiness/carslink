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

// Types de base pour la base de données
export interface FlyAccount {
  id: string
  auth_user_id: string
  role?: string | null
  [key: string]: any
}

export interface FlyPermission {
  id: string
  [key: string]: any
}

export interface FlyLog {
  id: string
  [key: string]: any
}

export interface CarsLinkClient {
  id: string
  flynesis_user_id: string
  first_name?: string | null
  last_name?: string | null
  email?: string | null
  phone?: string | null
  [key: string]: any
}

export interface CarsLinkVehicle {
  id: string
  flynesis_user_id: string
  brand?: string | null
  model?: string | null
  year?: number | null
  license_plate?: string | null
  [key: string]: any
}

export interface CarsLinkGarage {
  id: string
  name?: string | null
  address?: string | null
  [key: string]: any
}

export interface CarsLinkService {
  id: string
  name?: string | null
  [key: string]: any
}

export interface CarsLinkAppointment {
  id: string
  garage_id: string
  vehicle_id?: string | null
  status?: string | null
  start_time?: string | null
  [key: string]: any
}

export interface CarsLinkBusiness {
  id: string
  [key: string]: any
}

export interface CarsLinkSupportTicket {
  id: string
  [key: string]: any
}

export interface CarsLinkProUser {
  id: string
  [key: string]: any
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
  pdf_url?: string | null
  created_at?: string | null
  total_amount?: number | null
  status?: string | null
}

// Type pour les notifications
export interface Notification {
  id: string
  user_id: string
  title?: string | null
  message?: string | null
  type?: string | null
  read?: boolean | null
  archived?: boolean | null
  link?: string | null
  created_at?: string | null
}

// Types pour le chat IA
export interface AIChatConversation {
  id: string
  flynesis_user_id: string
  vehicle_id?: string | null
  appointment_id?: string | null
  garage_id?: string | null
  status?: 'active' | 'resolved' | 'archived' | null
  created_at?: string | null
  updated_at?: string | null
}

export interface AIChatMessage {
  id: string
  conversation_id: string
  role: 'user' | 'assistant'
  content: string
  ai_analysis?: {
    causes?: string[]
    urgency?: 'urgent' | 'moderate' | 'low'
    recommended_service?: string
    service_id?: string
  } | null
  created_at?: string | null
}