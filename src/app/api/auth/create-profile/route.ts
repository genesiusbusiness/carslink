import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { randomUUID } from "crypto"

// Configuration Supabase pour le client admin (côté serveur uniquement)
const supabaseUrl = 'https://yxkbvhymsvasknslhpsa.supabase.co'
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4a2J2aHltc3Zhc2tuc2xocHNhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTY3MjUyNCwiZXhwIjoyMDc3MjQ4NTI0fQ.kn1G0sBMZ0beUbHE3fo1eUv0ZygPAt6adrghVXw9Nac'

// Client admin pour les opérations côté serveur
const supabaseAdmin = createSupabaseClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { firstName, lastName, phone, userId } = body

    // Si userId est fourni (après signUp), l'utiliser directement
    // Sinon, vérifier l'authentification via les cookies
    let user
    if (userId) {
      // Utiliser le client admin pour obtenir les infos de l'utilisateur
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(userId)
      if (authError || !authUser.user) {
        return NextResponse.json(
          { error: "Utilisateur non trouvé", debug: { authError } },
          { status: 404 }
        )
      }
      user = authUser.user
    } else {
      // Vérifier que l'utilisateur est authentifié via les cookies
      const supabase = await createClient()
      const { data: authData, error: authError } = await supabase.auth.getUser()

      if (authError || !authData.user) {
        return NextResponse.json(
          { error: "Non authentifié", debug: { authError } },
          { status: 401 }
        )
      }
      user = authData.user
    }

    // Attendre un peu pour que le trigger crée le compte fly_accounts
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Vérifier si le compte fly_accounts existe déjà (créé par le trigger)
    let flyAccountResult = await supabaseAdmin
      .from('fly_accounts')
      .select('id')
      .eq('auth_user_id', user.id)
      .maybeSingle()


    let flyAccountId: string | null = null

    // Si le compte n'existe pas encore, le créer manuellement avec le client admin
    if (!flyAccountResult.data) {
      // Générer l'UUID côté serveur
      const accountId = randomUUID()
      
      // Essayer d'abord avec l'insertion normale
      let createError: any = null
      let newAccount: any = null
      
      const { data, error } = await supabaseAdmin
        .from('fly_accounts')
        .insert({
          id: accountId,
          auth_user_id: user.id,
          email: user.email || '',
          first_name: firstName || null,
          last_name: lastName || null,
          phone: phone || null,
          role: 'user',
        })
        .select('id')
        .single()

      createError = error
      newAccount = data
      

      // Si l'erreur est liée à gen_random_bytes, utiliser la fonction SQL create_fly_account_safe
      // qui contourne le trigger en désactivant temporairement les triggers
      if (createError && createError.message && createError.message.includes('gen_random_bytes')) {
        try {
          // Utiliser la fonction SQL create_fly_account_safe pour insérer avec les triggers désactivés
          
          const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc('create_fly_account_safe', {
            p_id: accountId,
            p_auth_user_id: user.id,
            p_email: user.email || '',
            p_first_name: firstName || null,
            p_last_name: lastName || null,
            p_phone: phone || null,
            p_role: 'user'
          })

          if (rpcError || !rpcData) {
            return NextResponse.json(
              { 
                error: `L'extension PostgreSQL 'pgcrypto' semble ne pas être activée ou la fonction create_fly_account_safe n'existe pas.\n\nSolutions :\n\n1. Vérifiez que l'extension est activée :\n   SELECT * FROM pg_extension WHERE extname = 'pgcrypto';\n\n2. Si elle n'est pas activée, exécutez :\n   CREATE EXTENSION IF NOT EXISTS pgcrypto;\n\n3. Appliquez la migration qui crée la fonction create_fly_account_safe.\n\nErreur technique : ${rpcError?.message || createError.message}`,
                code: 'PGCRYPTO_NOT_ENABLED',
              },
              { status: 500 }
            )
          }

          flyAccountId = rpcData
          newAccount = { id: rpcData }
          createError = null
        } catch (sqlError: any) {
          return NextResponse.json(
            { 
              error: `Erreur lors de la création du compte : ${createError?.message || sqlError.message}`,
              code: 'PGCRYPTO_NOT_ENABLED',
            },
            { status: 500 }
          )
        }
      }

      if (createError || !newAccount) {
        return NextResponse.json(
          { 
            error: createError?.message || "Erreur lors de la création du compte FlyID",
          },
          { status: 500 }
        )
      }
      
      flyAccountId = newAccount.id
    } else {
      flyAccountId = flyAccountResult.data.id
      // Mettre à jour le compte existant avec les infos complètes
      const { error: updateError } = await supabaseAdmin
        .from('fly_accounts')
        .update({
          first_name: firstName || null,
          last_name: lastName || null,
          phone: phone || null,
        })
        .eq('auth_user_id', user.id)
    }

    // Créer le profil CarsLink (carslink_clients) avec le flyid
    let carslinkClientId: string | null = null
    let carslinkUserId: string | null = null
    if (flyAccountId) {
      const { data: existingClient } = await supabaseAdmin
        .from('carslink_clients')
        .select('id')
        .eq('flyid', flyAccountId)
        .maybeSingle()

      if (existingClient) {
        carslinkClientId = existingClient.id
      } else {
        const { data: newClient, error: clientError } = await supabaseAdmin
          .from('carslink_clients')
          .insert({
            flyid: flyAccountId,
            phone: phone || null,
          })
          .select('id')
          .single()

        if (clientError) {
          console.error('❌ Erreur lors de la création de carslink_clients:', clientError)
          // Ce n'est pas bloquant, on continue quand même
        } else if (newClient) {
          carslinkClientId = newClient.id
          console.log('✅ carslink_clients créé:', carslinkClientId)
        }
      }

      // Synchroniser avec carslink_users (pour CarsLinkSupport)
      
      // Essayer d'abord avec la fonction RPC si elle existe
      try {
        const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc('link_flynesis_to_carslink', {
          p_flynesis_id: flyAccountId,
          p_role: 'client'
        })

        if (rpcError) {
          // RPC non disponible ou erreur (normal si la fonction n'existe pas)
        } else {
          carslinkUserId = rpcData
        }
      } catch (rpcException: any) {
        // Exception RPC (fonction peut ne pas exister)
      }

      // Si la RPC n'a pas fonctionné, essayer l'insertion directe
      if (!carslinkUserId) {
        const { data: existingUser } = await supabaseAdmin
          .from('carslink_users')
          .select('id')
          .eq('flynesis_user_id', flyAccountId)
          .maybeSingle()


        if (!existingUser) {
          // Insérer uniquement les colonnes qui existent vraiment
          const { data: newUser, error: userError } = await supabaseAdmin
            .from('carslink_users')
            .insert({
              flynesis_user_id: flyAccountId,
              role: 'client',
              is_active: true,
              is_deleted: false,
            })
            .select('id')
            .single()

          if (userError) {
            console.error('❌ Erreur lors de la création de carslink_users:', userError)
            // Ce n'est pas bloquant, on continue quand même
          } else {
            carslinkUserId = newUser?.id || null
            console.log('✅ carslink_users créé:', carslinkUserId)
          }
        } else {
          carslinkUserId = existingUser.id
        }
      }
    }

    // Log récapitulatif
    console.log('📋 Récapitulatif de la création de profil:')
    console.log('  - fly_accounts:', flyAccountId ? '✅ créé' : '❌ non créé')
    console.log('  - carslink_clients:', carslinkClientId ? '✅ créé' : '⚠️ non créé')
    console.log('  - carslink_users:', carslinkUserId ? '✅ créé' : '⚠️ non créé')

    return NextResponse.json({
      success: true,
      flyAccountId,
      carslinkClientId,
      carslinkUserId,
      created: {
        flyAccount: !!flyAccountId,
        carslinkClient: !!carslinkClientId,
        carslinkUser: !!carslinkUserId,
      }
    })
  } catch (error: any) {
    return NextResponse.json(
      { 
        error: error.message || "Erreur interne du serveur",
      },
      { status: 500 }
    )
  }
}
