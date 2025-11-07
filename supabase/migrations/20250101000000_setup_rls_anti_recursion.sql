-- ============================================================================
-- MIGRATION : Configuration RLS avec protection anti-récursion
-- ============================================================================
-- Cette migration configure Row Level Security (RLS) sur toutes les tables
-- avec des politiques sécurisées qui évitent la récursion et garantissent
-- un contrôle d'accès approprié pour clients, garages, support/admin.
-- ============================================================================

-- ============================================================================
-- PARTIE 1 : ACTIVER RLS SUR TOUTES LES TABLES EXISTANTES
-- ============================================================================

-- Liste des tables qui doivent avoir RLS activé (uniquement celles qui existent)
DO $$
DECLARE
  tbl RECORD;
  tables_to_secure TEXT[] := ARRAY[
    'fly_accounts',
    'carslink_clients',
    'vehicles',
    'carslink_garages',
    'appointments',
    'invoices',
    'app_settings'
  ];
BEGIN
  FOR tbl IN 
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = ANY(tables_to_secure)
  LOOP
    -- Activer RLS si désactivé
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl.tablename);
    RAISE NOTICE 'RLS activé sur la table: %', tbl.tablename;
  END LOOP;
END $$;

-- ============================================================================
-- PARTIE 2 : SUPPRIMER LES POLITIQUES PERMISSIVES EXISTANTES
-- ============================================================================

-- Supprimer les politiques qui utilisent USING (true) et WITH CHECK (true)
-- pour les rôles non-admin (sauf service_role qui doit bypasser RLS par nature)
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT schemaname, tablename, policyname, roles::TEXT[] as roles_text
    FROM pg_policies
    WHERE schemaname = 'public'
    AND (
      roles::TEXT[] = ARRAY['authenticated']::TEXT[] 
      OR roles::TEXT[] = ARRAY['anon']::TEXT[]
      OR 'authenticated' = ANY(roles::TEXT[])
      OR 'anon' = ANY(roles::TEXT[])
    )
    AND (
      qual::text LIKE '%true%' OR
      with_check::text LIKE '%true%'
    )
  LOOP
    -- Ne pas supprimer les politiques pour service_role car elles sont nécessaires
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies p2
      WHERE p2.tablename = pol.tablename
      AND p2.policyname = pol.policyname
      AND 'service_role' = ANY(p2.roles::TEXT[])
    ) THEN
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
        pol.policyname, pol.schemaname, pol.tablename);
      RAISE NOTICE 'Politique supprimée: % sur %', pol.policyname, pol.tablename;
    END IF;
  END LOOP;
END $$;

-- ============================================================================
-- PARTIE 3 : FONCTION HELPER POUR ÉVITER LA RÉCURSION
-- ============================================================================

-- Fonction pour obtenir le fly_account_id de l'utilisateur actuel
-- Cette fonction évite la récursion en utilisant auth.uid() directement
CREATE OR REPLACE FUNCTION get_current_fly_account_id()
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  account_id UUID;
BEGIN
  -- Utiliser auth.uid() directement pour éviter la récursion
  SELECT id INTO account_id
  FROM fly_accounts
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
  
  RETURN account_id;
END;
$$;

-- Fonction pour vérifier si l'utilisateur est admin/support
-- Évite la récursion en utilisant auth.uid() directement
CREATE OR REPLACE FUNCTION is_admin_or_support()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Utiliser auth.uid() directement pour éviter la récursion
  SELECT role INTO user_role
  FROM fly_accounts
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
  
  RETURN user_role IN ('admin', 'support', 'founder');
END;
$$;

-- ============================================================================
-- PARTIE 4 : POLITIQUES RLS POUR fly_accounts (ANTI-RÉCURSION)
-- ============================================================================

-- S'assurer que RLS est activé
ALTER TABLE IF EXISTS fly_accounts ENABLE ROW LEVEL SECURITY;

-- Politique SELECT : Les utilisateurs peuvent voir leur propre compte
-- Utilise auth.uid() directement pour éviter la récursion
DROP POLICY IF EXISTS "Users can view their own account" ON fly_accounts;
CREATE POLICY "Users can view their own account"
  ON fly_accounts
  FOR SELECT
  TO authenticated
  USING (auth_user_id = auth.uid());

-- Politique UPDATE : Les utilisateurs peuvent mettre à jour leur propre compte
DROP POLICY IF EXISTS "Users can update their own account" ON fly_accounts;
CREATE POLICY "Users can update their own account"
  ON fly_accounts
  FOR UPDATE
  TO authenticated
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

-- Politique INSERT : Les utilisateurs peuvent créer leur propre compte
DROP POLICY IF EXISTS "Users can insert their own account" ON fly_accounts;
CREATE POLICY "Users can insert their own account"
  ON fly_accounts
  FOR INSERT
  TO authenticated
  WITH CHECK (auth_user_id = auth.uid());

-- ============================================================================
-- PARTIE 5 : POLITIQUES RLS POUR carslink_clients (ANTI-RÉCURSION)
-- ============================================================================

-- S'assurer que RLS est activé
ALTER TABLE IF EXISTS carslink_clients ENABLE ROW LEVEL SECURITY;

-- Politique SELECT : Les clients peuvent voir leur propre profil
-- Utilise auth.uid() directement via fly_accounts pour éviter la récursion
-- Note: La colonne s'appelle 'flyid' dans carslink_clients, pas 'flynesis_user_id'
DROP POLICY IF EXISTS "Clients can view their own profile" ON carslink_clients;
CREATE POLICY "Clients can view their own profile"
  ON carslink_clients
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM fly_accounts fa
      WHERE fa.id = carslink_clients.flyid
      AND fa.auth_user_id = auth.uid()
    )
  );

-- Politique UPDATE : Les clients peuvent mettre à jour leur propre profil
DROP POLICY IF EXISTS "Clients can update their own profile" ON carslink_clients;
CREATE POLICY "Clients can update their own profile"
  ON carslink_clients
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM fly_accounts fa
      WHERE fa.id = carslink_clients.flyid
      AND fa.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM fly_accounts fa
      WHERE fa.id = carslink_clients.flyid
      AND fa.auth_user_id = auth.uid()
    )
  );

-- Politique INSERT : Les clients peuvent créer leur propre profil
DROP POLICY IF EXISTS "Clients can insert their own profile" ON carslink_clients;
CREATE POLICY "Clients can insert their own profile"
  ON carslink_clients
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM fly_accounts fa
      WHERE fa.id = carslink_clients.flyid
      AND fa.auth_user_id = auth.uid()
    )
  );

-- Les admins/support peuvent voir tous les clients
DROP POLICY IF EXISTS "Admins can view all clients" ON carslink_clients;
CREATE POLICY "Admins can view all clients"
  ON carslink_clients
  FOR SELECT
  TO authenticated
  USING (is_admin_or_support());

-- ============================================================================
-- PARTIE 6 : POLITIQUES RLS POUR vehicles (ANTI-RÉCURSION)
-- ============================================================================

-- S'assurer que RLS est activé
-- Note: La table s'appelle 'vehicles', pas 'carslink_vehicles'
ALTER TABLE IF EXISTS vehicles ENABLE ROW LEVEL SECURITY;

-- Politique SELECT : Les clients peuvent voir leurs propres véhicules
-- Note: flynesis_user_id dans vehicles fait référence à fly_accounts.id
DROP POLICY IF EXISTS "Clients can view their own vehicles" ON vehicles;
CREATE POLICY "Clients can view their own vehicles"
  ON vehicles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM fly_accounts fa
      WHERE fa.id = vehicles.flynesis_user_id
      AND fa.auth_user_id = auth.uid()
    )
  );

-- Politique UPDATE : Les clients peuvent mettre à jour leurs propres véhicules
DROP POLICY IF EXISTS "Clients can update their own vehicles" ON vehicles;
CREATE POLICY "Clients can update their own vehicles"
  ON vehicles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM fly_accounts fa
      WHERE fa.id = vehicles.flynesis_user_id
      AND fa.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM fly_accounts fa
      WHERE fa.id = vehicles.flynesis_user_id
      AND fa.auth_user_id = auth.uid()
    )
  );

-- Politique INSERT : Les clients peuvent créer leurs propres véhicules
DROP POLICY IF EXISTS "Clients can insert their own vehicles" ON vehicles;
CREATE POLICY "Clients can insert their own vehicles"
  ON vehicles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM fly_accounts fa
      WHERE fa.id = vehicles.flynesis_user_id
      AND fa.auth_user_id = auth.uid()
    )
  );

-- Les admins/support peuvent voir tous les véhicules
DROP POLICY IF EXISTS "Admins can view all vehicles" ON vehicles;
CREATE POLICY "Admins can view all vehicles"
  ON vehicles
  FOR SELECT
  TO authenticated
  USING (is_admin_or_support());

-- ============================================================================
-- PARTIE 7 : POLITIQUES RLS POUR carslink_garages (ANTI-RÉCURSION)
-- ============================================================================

-- S'assurer que RLS est activé
ALTER TABLE IF EXISTS carslink_garages ENABLE ROW LEVEL SECURITY;

-- Politique SELECT : Tous les utilisateurs authentifiés peuvent voir les garages
-- (pour la recherche et la réservation)
DROP POLICY IF EXISTS "Authenticated users can view garages" ON carslink_garages;
CREATE POLICY "Authenticated users can view garages"
  ON carslink_garages
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- Les garages peuvent voir et modifier leur propre profil
-- (nécessite une table de liaison garage <-> fly_account)
-- Pour l'instant, seuls les admins peuvent modifier
DROP POLICY IF EXISTS "Admins can update garages" ON carslink_garages;
CREATE POLICY "Admins can update garages"
  ON carslink_garages
  FOR UPDATE
  TO authenticated
  USING (is_admin_or_support())
  WITH CHECK (is_admin_or_support());

-- ============================================================================
-- PARTIE 8 : POLITIQUES RLS POUR appointments (ANTI-RÉCURSION)
-- ============================================================================

-- S'assurer que RLS est activé
-- Note: La table s'appelle 'appointments', pas 'carslink_appointments'
ALTER TABLE IF EXISTS appointments ENABLE ROW LEVEL SECURITY;

-- Politique SELECT : Les clients peuvent voir leurs propres rendez-vous
DROP POLICY IF EXISTS "Clients can view their own appointments" ON appointments;
CREATE POLICY "Clients can view their own appointments"
  ON appointments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM vehicles v
      JOIN fly_accounts fa ON fa.id = v.flynesis_user_id
      WHERE v.id = appointments.vehicle_id
      AND fa.auth_user_id = auth.uid()
    )
  );

-- Politique UPDATE : Les clients peuvent mettre à jour leurs propres rendez-vous
-- (seulement pour certains champs comme le statut)
DROP POLICY IF EXISTS "Clients can update their own appointments" ON appointments;
CREATE POLICY "Clients can update their own appointments"
  ON appointments
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM vehicles v
      JOIN fly_accounts fa ON fa.id = v.flynesis_user_id
      WHERE v.id = appointments.vehicle_id
      AND fa.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM vehicles v
      JOIN fly_accounts fa ON fa.id = v.flynesis_user_id
      WHERE v.id = appointments.vehicle_id
      AND fa.auth_user_id = auth.uid()
    )
  );

-- Politique INSERT : Les clients peuvent créer leurs propres rendez-vous
DROP POLICY IF EXISTS "Clients can insert their own appointments" ON appointments;
CREATE POLICY "Clients can insert their own appointments"
  ON appointments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM vehicles v
      JOIN fly_accounts fa ON fa.id = v.flynesis_user_id
      WHERE v.id = appointments.vehicle_id
      AND fa.auth_user_id = auth.uid()
    )
  );

-- Les admins/support peuvent voir tous les rendez-vous
DROP POLICY IF EXISTS "Admins can view all appointments" ON appointments;
CREATE POLICY "Admins can view all appointments"
  ON appointments
  FOR SELECT
  TO authenticated
  USING (is_admin_or_support());

-- ============================================================================
-- PARTIE 9 : POLITIQUES RLS POUR app_settings (ANTI-RÉCURSION)
-- ============================================================================

-- S'assurer que RLS est activé
ALTER TABLE IF EXISTS app_settings ENABLE ROW LEVEL SECURITY;

-- Fonction RPC pour récupérer un paramètre (utilisée par encryption.ts)
-- Cette fonction est SECURITY DEFINER pour bypasser RLS
-- Supprimer d'abord la fonction existante si elle existe avec un paramètre différent
DROP FUNCTION IF EXISTS get_app_setting(TEXT);
DROP FUNCTION IF EXISTS get_app_setting(text);
DROP FUNCTION IF EXISTS get_app_setting(p_key TEXT);
DROP FUNCTION IF EXISTS get_app_setting(p_key text);

CREATE OR REPLACE FUNCTION get_app_setting(setting_key TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  setting_value TEXT;
BEGIN
  SELECT value INTO setting_value
  FROM app_settings
  WHERE key = setting_key
  LIMIT 1;
  
  RETURN setting_value;
END;
$$;

-- Fonction RPC pour définir un paramètre (admin seulement)
-- Supprimer d'abord la fonction existante si elle existe
DROP FUNCTION IF EXISTS set_app_setting(TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS set_app_setting(text, text, text, text);
DROP FUNCTION IF EXISTS set_app_setting(TEXT, TEXT, TEXT, BOOLEAN, TEXT);
DROP FUNCTION IF EXISTS set_app_setting(text, text, text, boolean, text);

-- Note: La table app_settings peut avoir différentes structures selon le projet
-- On simplifie pour utiliser uniquement les colonnes de base: key, value, description, category, updated_at
CREATE OR REPLACE FUNCTION set_app_setting(
  setting_key TEXT,
  setting_value TEXT,
  setting_description TEXT DEFAULT NULL,
  category TEXT DEFAULT 'general'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Vérifier que l'utilisateur est admin
  IF NOT is_admin_or_support() THEN
    RAISE EXCEPTION 'Seuls les admins peuvent modifier les paramètres';
  END IF;
  
  -- Utiliser une approche flexible qui fonctionne avec différentes structures de table
  -- On essaie d'insérer avec les colonnes disponibles
  BEGIN
    INSERT INTO app_settings (key, value, description, category, updated_at)
    VALUES (setting_key, setting_value, setting_description, category, NOW())
    ON CONFLICT (key) DO UPDATE SET
      value = EXCLUDED.value,
      description = EXCLUDED.description,
      category = EXCLUDED.category,
      updated_at = NOW();
  EXCEPTION WHEN OTHERS THEN
    -- Si certaines colonnes n'existent pas, essayer avec juste key et value
    INSERT INTO app_settings (key, value, updated_at)
    VALUES (setting_key, setting_value, NOW())
    ON CONFLICT (key) DO UPDATE SET
      value = EXCLUDED.value,
      updated_at = NOW();
  END;
  
  RETURN TRUE;
END;
$$;

-- Politique SELECT : Tous les utilisateurs authentifiés peuvent voir les paramètres
-- (Les paramètres sensibles doivent être gérés au niveau applicatif)
DROP POLICY IF EXISTS "Authenticated users can view app settings" ON app_settings;
CREATE POLICY "Authenticated users can view app settings"
  ON app_settings
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- ============================================================================
-- PARTIE 10 : POLITIQUES RLS POUR invoices (ANTI-RÉCURSION)
-- ============================================================================

-- S'assurer que RLS est activé
ALTER TABLE IF EXISTS invoices ENABLE ROW LEVEL SECURITY;

-- Politique SELECT : Les clients peuvent voir leurs propres factures
DROP POLICY IF EXISTS "Clients can view their own invoices" ON invoices;
CREATE POLICY "Clients can view their own invoices"
  ON invoices
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM fly_accounts fa
      WHERE fa.id = invoices.flynesis_user_id
      AND fa.auth_user_id = auth.uid()
    )
  );

-- Les admins/support peuvent voir toutes les factures
DROP POLICY IF EXISTS "Admins can view all invoices" ON invoices;
CREATE POLICY "Admins can view all invoices"
  ON invoices
  FOR SELECT
  TO authenticated
  USING (is_admin_or_support());

-- ============================================================================
-- PARTIE 11 : PERMISSIONS POUR SERVICE ROLE
-- ============================================================================

-- Le service_role doit pouvoir bypasser RLS pour les migrations
-- (c'est le comportement par défaut de Supabase, mais on le documente ici)

-- Donner les permissions d'exécution aux fonctions RPC
GRANT EXECUTE ON FUNCTION get_app_setting(TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION set_app_setting(TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_current_fly_account_id() TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin_or_support() TO authenticated;

-- ============================================================================
-- PARTIE 12 : VÉRIFICATION ET RAPPORT
-- ============================================================================

-- Fonction pour vérifier l'état de sécurité de toutes les tables
CREATE OR REPLACE FUNCTION check_security_status()
RETURNS TABLE (
  table_name TEXT,
  rls_enabled BOOLEAN,
  policies_count BIGINT,
  has_permissive_policies BOOLEAN,
  security_status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.tablename::TEXT,
    t.rowsecurity AS rls_enabled,
    COALESCE(p.policy_count, 0)::BIGINT AS policies_count,
    COALESCE(p.has_permissive, false) AS has_permissive_policies,
    CASE 
      WHEN NOT t.rowsecurity THEN '❌ RLS DÉSACTIVÉ - CRITIQUE'
      WHEN COALESCE(p.policy_count, 0) = 0 THEN '⚠️ AUCUNE POLITIQUE RLS'
      WHEN COALESCE(p.has_permissive, false) THEN '⚠️ POLITIQUES PERMISSIVES DÉTECTÉES'
      ELSE '✅ SÉCURISÉ'
    END AS security_status
  FROM pg_tables t
  LEFT JOIN (
    SELECT 
      tablename,
      COUNT(*) AS policy_count,
      BOOL_OR(
        (qual::text LIKE '%true%' OR with_check::text LIKE '%true%')
        AND NOT ('service_role' = ANY(roles::TEXT[]))
      ) AS has_permissive
    FROM pg_policies
    WHERE schemaname = 'public'
    GROUP BY tablename
  ) p ON t.tablename = p.tablename
  WHERE t.schemaname = 'public'
  AND t.tablename NOT LIKE 'pg_%'
  AND t.tablename IN (
    'fly_accounts', 'carslink_clients', 'vehicles', 
    'carslink_garages', 'appointments', 'app_settings',
    'invoices'
  )
  ORDER BY security_status DESC, t.tablename;
END;
$$;

-- Donner les permissions pour exécuter la fonction de vérification
GRANT EXECUTE ON FUNCTION check_security_status() TO authenticated;

-- Exécuter la vérification de sécurité
SELECT * FROM check_security_status();

-- Rapport de sécurité
SELECT 
  '🔒 RAPPORT DE SÉCURITÉ RLS' AS title,
  COUNT(*) FILTER (WHERE rls_enabled) AS tables_with_rls,
  COUNT(*) FILTER (WHERE NOT rls_enabled) AS tables_without_rls,
  COUNT(*) FILTER (WHERE has_permissive_policies) AS tables_with_permissive_policies
FROM check_security_status();
