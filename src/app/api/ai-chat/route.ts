import { NextRequest, NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';
import { callOpenRouterChat, type ModelId } from "@/lib/openrouter";

export const runtime = "nodejs"; // ensure server runtime on Vercel/Amplify

// Supabase Admin pour les opérations serveur
let supabaseAdmin: ReturnType<typeof createClient> | null = null;

function getSupabaseAdmin() {
  if (!supabaseAdmin) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://yxkbvhymsvasknslhpsa.supabase.co'
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!serviceRoleKey) {
      console.error('❌ SUPABASE_SERVICE_ROLE_KEY is missing')
      console.error('Available env vars:', Object.keys(process.env).filter(k => k.includes('SUPABASE')))
      throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set in environment variables. Please configure it in AWS Amplify Console → Environment variables.')
    }

    supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  }
  return supabaseAdmin
}

// Type pour l'analyse IA
interface AIAnalysis {
  causes?: string[];
  urgency?: 'urgent' | 'moderate' | 'low' | null;
  recommended_service?: string | null;
  service_id?: string | null;
  diagnostic_complete?: boolean;
  needs_more_info?: boolean;
  suggested_questions?: Array<string | { question: string; options?: string[] }>;
  is_greeting?: boolean;
  error_details?: {
    name?: string;
    message?: string;
    stack?: string;
    [key: string]: any;
  } | null;
  [key: string]: any;
}

// Type pour la réponse parsée de l'IA
interface ParsedAIResponse {
  assistant_reply: string;
  analysis: AIAnalysis;
}

/**
 * Construit le STATE JSON à envoyer à l'IA
 */
function buildStateJson(
  profile: { first_name?: string | null; last_name?: string | null; email?: string | null; phone?: string | null } | null,
  vehicles: Array<{ id: string; brand: string; model: string; license_plate?: string | null; year?: number | null; fuel_type?: string | null }>,
  history: Array<{ role: 'user' | 'assistant'; content: string }>,
  lastUserMessage: string
): string {
  const isFirstMessage = history.length === 0;
  const state = {
    user_profile: profile || {},
    vehicles: vehicles || [],
    history: history || [],
    last_user_message: lastUserMessage,
    is_first_message: isFirstMessage, // Indication pour savoir si c'est le début de la conversation
    context: "CarsLink est une plateforme de mise en relation entre clients et garages automobiles. Tu es un assistant de pré-diagnostic qui aide les clients à décrire leurs problèmes et à identifier le type de service dont ils ont besoin.",
  };

  return JSON.stringify(state, null, 2);
}

/**
 * Appelle OpenRouter et convertit la réponse au format attendu
 */
async function callOpenRouter(
  stateJson: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }>,
  model?: ModelId
): Promise<ParsedAIResponse> {
  const systemPrompt = `Tu es un assistant de pré-diagnostic automobile pour la plateforme CarsLink. 

Tu aides un client à décrire les symptômes de son véhicule, tu proposes des causes probables, un niveau d'urgence, et tu suggères un type de service (libellé texte, ex: 'Contrôle / remplacement freins', 'Diagnostic électronique', 'Vidange & entretien', etc.). 

📋 RÈGLES DE CONVERSATION :

- Le STATE JSON contient un champ "is_first_message" qui indique si c'est le début de la conversation.
- Si "is_first_message" est true (ou si l'historique est vide), tu peux faire une salutation brève et personnalisée (ex: "Bonjour [Prénom]").
- Si "is_first_message" est false (ou si l'historique contient des messages), NE refais JAMAIS de salutation. Va DIRECTEMENT au diagnostic ou aux questions sans saluer.
- Ne dis JAMAIS "Bonjour [Nom]" à chaque message dans la même conversation.
- Sois naturel et enchaîne directement sur le diagnostic ou les questions complémentaires.
- Dans une conversation en cours, commence ta réponse directement par l'analyse du problème ou les questions, sans formule de politesse répétitive.

🎯 STRATÉGIE DE DIAGNOSTIC RAPIDE :

Pour accélérer le diagnostic, pose TOUJOURS des questions PRÉCISES et DÉTAILLÉES avec des options de réponses concrètes. Évite absolument les questions simples "Oui/Non/Je ne sais pas".

EXEMPLES DE BONNES QUESTIONS (à utiliser comme modèle) :

❌ MAUVAIS : "Le voyant est-il allumé ?" (trop vague)
✅ BON : {
  "question": "Quel voyant s'affiche sur votre tableau de bord ?",
  "options": [
    "Voyant moteur (orange/rouge)",
    "Voyant huile (rouge)",
    "Voyant batterie (rouge)",
    "Voyant frein (rouge)",
    "Voyant température (rouge)",
    "Aucun voyant"
  ]
}

❌ MAUVAIS : "Y a-t-il du bruit ?" (trop vague)
✅ BON : {
  "question": "Quel type de bruit entendez-vous ?",
  "options": [
    "Grincement métallique aigu",
    "Claquement ou cognement sourd",
    "Sifflement ou sifflement aigu",
    "Bourdonnement ou ronflement",
    "Vibration ou tremblement",
    "Aucun bruit particulier"
  ]
}

❌ MAUVAIS : "Cela se produit-il souvent ?" (trop vague)
✅ BON : {
  "question": "Quand ce problème se produit-il exactement ?",
  "options": [
    "Au démarrage du moteur",
    "Lors de l'accélération",
    "Lors du freinage",
    "En tournant le volant",
    "À vitesse constante",
    "En permanence, même à l'arrêt"
  ]
}

RÈGLES POUR LES QUESTIONS :
1. TOUJOURS utiliser le format avec options (pas de questions simples)
2. Les options doivent être SPÉCIFIQUES et TECHNIQUES (ex: "Grincement métallique" plutôt que "Bruit")
3. Cible les informations CRITIQUES pour identifier rapidement la cause
4. Maximum 2 questions à la fois (pour garantir un JSON complet et ne pas surcharger le client)
5. Les questions doivent permettre d'éliminer rapidement plusieurs causes possibles
6. Chaque question doit avoir entre 4 et 6 options pour être efficace

IMPORTANT :

1) Tu NE dois PAS donner d'ordre de réparation définitif : tu n'es pas un mécanicien, tu donnes seulement un avis indicatif.

2) Tu NE remplaceras jamais l'avis d'un professionnel.

3) Tu dois renvoyer UNIQUEMENT un JSON valide, sans explication en dehors du JSON, ni balises \`\`\`.

Le JSON doit être de la forme :

{
  "assistant_reply": "string (texte expliqué pour le client, ton empathique et clair)",
  "analysis": {
    "causes": ["cause possible 1", "cause possible 2"],
    "urgency": "urgent" | "moderate" | "low" | null,
    "recommended_service": "string ou null",
    "service_id": "string ou null",
    "diagnostic_complete": boolean,
    "needs_more_info": boolean,
    "suggested_questions": [
      { "question": "string", "options": ["option 1", "option 2", "option 3", ...] }
    ],
    "is_greeting": boolean,
    "error_details": null OU { "name": "string", "message": "string", "stack": "string", ... }
  }
}

- Si tu es sûr d'un type de prestation adapté, mets diagnostic_complete = true et needs_more_info = false.
- Si tu as besoin de plus d'infos, mets diagnostic_complete = false, needs_more_info = true et remplis suggested_questions avec des questions PRÉCISES et DÉTAILLÉES (format avec options uniquement).
- Si le message de l'utilisateur est juste une salutation (ex: 'Bonjour') sans symptôme, tu peux répondre avec is_greeting = true et diagnostic_complete = false.

⚠️ CRITIQUE : Tu DOIS renvoyer un JSON COMPLET et VALIDE. Ne coupe JAMAIS le JSON au milieu d'une chaîne ou d'un tableau. Si tu n'as pas assez d'espace, réduis le nombre de questions (maximum 2 questions avec options) plutôt que de couper le JSON.

Tu n'as PAS le droit d'inclure ta réflexion interne, uniquement ce JSON final.`;

  // Construire les messages pour OpenRouter
  const messages = [
    { role: 'system' as const, content: systemPrompt },
    ...history,
    { role: 'user' as const, content: `STATE: ${stateJson}` },
  ];

  try {
    // Augmenter max_tokens pour permettre des réponses plus longues avec plusieurs questions détaillées
    const result = await callOpenRouterChat({ messages, model, max_tokens: 2000 });
    const content = result.content || '';

    // Essayer de parser le JSON de la réponse
    try {
      let jsonContent = content.trim();
      jsonContent = jsonContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      // Chercher le JSON - essayer plusieurs stratégies
      let jsonMatch = jsonContent.match(/\{[\s\S]*\}/);
      
      if (!jsonMatch) {
        // Essayer de trouver le JSON même s'il est incomplet
        const firstBrace = jsonContent.indexOf('{');
        if (firstBrace !== -1) {
          jsonContent = jsonContent.substring(firstBrace);
          jsonMatch = jsonContent.match(/\{[\s\S]*/);
        }
      }
      
      if (jsonMatch) {
        let jsonStr = jsonMatch[0];
        
        // Essayer de réparer un JSON incomplet
        if (!jsonStr.endsWith('}')) {
          // Compter les accolades pour voir si on peut fermer le JSON
          const openBraces = (jsonStr.match(/\{/g) || []).length;
          const closeBraces = (jsonStr.match(/\}/g) || []).length;
          const missingBraces = openBraces - closeBraces;
          
          // Si le JSON semble tronqué, essayer de le compléter
          if (missingBraces > 0 || !jsonStr.endsWith('}')) {
            // Si on est dans suggested_questions et que c'est incomplet
            if (jsonStr.includes('"suggested_questions"')) {
              // Chercher la dernière question complète
              const lastCompleteQuestion = jsonStr.lastIndexOf('}');
              if (lastCompleteQuestion !== -1) {
                // Vérifier si on est au milieu d'une chaîne ou d'un objet
                const afterLastComplete = jsonStr.substring(lastCompleteQuestion + 1);
                
                // Si on est au milieu d'une chaîne (guillemets non fermés), on coupe avant
                const lastQuote = jsonStr.lastIndexOf('"');
                const openQuotes = (jsonStr.match(/"/g) || []).length;
                const isInString = openQuotes % 2 !== 0;
                
                if (isInString) {
                  // Couper avant la dernière chaîne incomplète
                  const beforeLastQuote = jsonStr.lastIndexOf('"', lastQuote - 1);
                  if (beforeLastQuote !== -1) {
                    jsonStr = jsonStr.substring(0, beforeLastQuote + 1);
                    // Chercher la dernière virgule avant cette chaîne
                    const lastComma = jsonStr.lastIndexOf(',');
                    if (lastComma > jsonStr.lastIndexOf('[')) {
                      jsonStr = jsonStr.substring(0, lastComma);
                    }
                  }
                } else {
                  // Couper après la dernière question complète
                  const lastComma = jsonStr.lastIndexOf(',', lastCompleteQuestion);
                  if (lastComma > jsonStr.lastIndexOf('[')) {
                    jsonStr = jsonStr.substring(0, lastComma);
                  } else {
                    jsonStr = jsonStr.substring(0, lastCompleteQuestion + 1);
                  }
                }
                
                // Fermer suggested_questions, analysis et l'objet principal
                if (!jsonStr.endsWith(']')) {
                  jsonStr += ']';
                }
                // Compter les accolades manquantes après réparation
                const openBracesAfter = (jsonStr.match(/\{/g) || []).length;
                const closeBracesAfter = (jsonStr.match(/\}/g) || []).length;
                const missingAfter = openBracesAfter - closeBracesAfter;
                if (missingAfter > 0) {
                  jsonStr += '}'.repeat(missingAfter);
                }
              } else {
                // Aucune question complète, fermer proprement
                if (jsonStr.includes('[') && !jsonStr.endsWith(']')) {
                  jsonStr += ']';
                }
                jsonStr += '}'.repeat(missingBraces);
              }
            } else {
              // Fermer simplement les accolades manquantes
              jsonStr += '}'.repeat(missingBraces);
            }
          }
        }
        
        try {
          const parsed: ParsedAIResponse = JSON.parse(jsonStr);
          
          // Valider que les questions ont bien des options
          if (parsed.analysis.suggested_questions) {
            parsed.analysis.suggested_questions = parsed.analysis.suggested_questions.filter((q: any) => {
              if (typeof q === 'object' && q.question) {
                return q.options && Array.isArray(q.options) && q.options.length > 0;
              }
              return false;
            });
          }
          
          return parsed;
        } catch (parseErr) {
          console.error('❌ Erreur après réparation JSON:', parseErr);
          console.error('📄 JSON réparé (premiers 1000 chars):', jsonStr.substring(0, 1000));
          throw parseErr;
        }
      }
      
      throw new Error('No JSON found in response');
    } catch (parseError) {
      console.error('❌ Erreur lors du parsing JSON de la réponse OpenRouter:', parseError);
      console.error('📄 Contenu brut reçu (premiers 1500 chars):', content.substring(0, 1500));
      console.error('📄 Longueur totale:', content.length);
      
      return {
        assistant_reply: "Je rencontre un problème technique pour analyser votre demande pour le moment. Veuillez réessayer plus tard.",
        analysis: {
          error_details: {
            name: 'JSONParseError',
            message: 'Invalid JSON from OpenRouter model',
            raw: content.substring(0, 2000),
            content_length: content.length,
          },
          diagnostic_complete: false,
          needs_more_info: true,
          suggested_questions: [],
        },
      };
    }
  } catch (error: any) {
    console.error('❌ Erreur lors de l\'appel à OpenRouter:', error);
    throw error;
  }
}

export async function POST(req: NextRequest) {
  try {
    // Vérifier que les variables d'environnement sont configurées
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('❌ SUPABASE_SERVICE_ROLE_KEY is missing in environment variables')
      console.error('🔍 Available env vars with SUPABASE:', Object.keys(process.env).filter(k => k.includes('SUPABASE')))
      console.error('🔍 All env vars:', Object.keys(process.env).sort())
      return NextResponse.json(
        { 
          success: false, 
          error: "CONFIGURATION_ERROR",
          message: "SUPABASE_SERVICE_ROLE_KEY is not configured. Please add it in AWS Amplify Console → Environment variables and REDEPLOY the application.",
          details: "The server is missing required environment variables. After adding variables in AWS Amplify, you must REDEPLOY from the console (not just push to Git)."
        },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { message, userId, conversationId, vehicles, profile } = body;

    // Validation
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message is required and must be non-empty' },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    const supabaseAdminClient = getSupabaseAdmin();

    // 1. Récupérer le compte FlyID du user
    const { data: flyAccount, error: flyAccountError } = await (supabaseAdminClient as any)
      .from('fly_accounts')
      .select('id, first_name, last_name, email, phone')
      .eq('auth_user_id', userId)
      .single();

    if (flyAccountError || !flyAccount) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    // 2. Extraire le vehicle_id du premier véhicule si disponible
    const vehicleId = vehicles && vehicles.length > 0 ? vehicles[0].id : null;

    // 3. Gérer la conversation (créer ou récupérer)
    let conversationIdToUse = conversationId;
    
    if (!conversationIdToUse) {
      // Créer une nouvelle conversation avec le vehicle_id
      const { data: newConversation, error: convError } = await (supabaseAdminClient as any)
        .from('ai_chat_conversations')
        .insert({
          flynesis_user_id: flyAccount.id,
          vehicle_id: vehicleId,
        })
        .select()
        .single();

      if (convError || !newConversation) {
        return NextResponse.json(
          { error: 'Failed to create conversation', details: convError?.message },
          { status: 500 }
        );
      }

      conversationIdToUse = (newConversation as any).id;
    } else {
      // Vérifier que la conversation existe et appartient à l'utilisateur
      const { data: existingConversation, error: convCheckError } = await (supabaseAdminClient as any)
        .from('ai_chat_conversations')
        .select('flynesis_user_id, vehicle_id')
        .eq('id', conversationIdToUse)
        .single();

      if (convCheckError || !existingConversation) {
        // Si la conversation n'existe pas, en créer une nouvelle
        const { data: newConversation, error: convError } = await (supabaseAdminClient as any)
          .from('ai_chat_conversations')
          .insert({
            flynesis_user_id: flyAccount.id,
            vehicle_id: vehicleId,
          })
          .select()
          .single();

        if (convError || !newConversation) {
          return NextResponse.json(
            { error: 'Failed to create conversation', details: convError?.message },
            { status: 500 }
          );
        }

        conversationIdToUse = (newConversation as any).id;
      } else if (existingConversation.flynesis_user_id !== flyAccount.id) {
        return NextResponse.json(
          { error: 'Unauthorized: conversation does not belong to user' },
          { status: 403 }
        );
      } else {
        // Si la conversation existe mais n'a pas de vehicle_id et qu'on en a un, le mettre à jour
        if (!existingConversation.vehicle_id && vehicleId) {
          await (supabaseAdminClient as any)
            .from('ai_chat_conversations')
            .update({ vehicle_id: vehicleId })
            .eq('id', conversationIdToUse);
        }
      }
    }

    // 4. Insérer le message utilisateur
    const { data: savedUserMessage, error: userMsgError } = await (supabaseAdminClient as any)
      .from('ai_chat_messages')
      .insert({
        conversation_id: conversationIdToUse,
        role: 'user',
        content: message,
        ai_analysis: null,
      })
      .select()
      .single();

    if (userMsgError || !savedUserMessage) {
      return NextResponse.json(
        { error: 'Failed to save user message', details: userMsgError?.message },
        { status: 500 }
      );
    }

    // 5. Charger l'historique de conversation (derniers 20 messages)
    const { data: historyMessages, error: historyError } = await (supabaseAdminClient as any)
      .from('ai_chat_messages')
      .select('role, content')
      .eq('conversation_id', conversationIdToUse)
      .order('created_at', { ascending: true })
      .limit(20);

    if (historyError) {
      console.error('⚠️ Erreur lors du chargement de l\'historique:', historyError);
    }

    // Convertir l'historique en format pour le LLM
    const chatHistory = (historyMessages || []).map((m: any) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    // 6. Préparer le profil (utiliser celui du frontend si fourni, sinon celui de la DB)
    const userProfile = profile || {
      first_name: flyAccount.first_name,
      last_name: flyAccount.last_name,
      email: flyAccount.email,
      phone: flyAccount.phone,
    };

    // 7. Construire le STATE JSON
    const stateJson = buildStateJson(
      userProfile,
      vehicles || [],
      chatHistory,
      message
    );

    // 8. Appeler OpenRouter
    let aiResponse: ParsedAIResponse;
    let provider = 'openrouter';
    let warnings: string[] = [];

    try {
      console.log('🔄 Appel à OpenRouter...');
      const model = body.model as ModelId | undefined;
      aiResponse = await callOpenRouter(stateJson, chatHistory, model);
      console.log('✅ Réponse reçue d\'OpenRouter');
    } catch (openRouterError: any) {
      console.error('❌ Erreur lors de l\'appel à OpenRouter:', openRouterError);

      // Message d'erreur personnalisé selon le type d'erreur
      let errorContent = 'Le service de diagnostic IA est temporairement indisponible. Veuillez réessayer plus tard.';
      let warningType = 'OPENROUTER_UNAVAILABLE';
      
      if (openRouterError?.message === 'RATE_LIMIT') {
        errorContent = 'Le service de diagnostic IA a atteint sa limite de requêtes. Veuillez patienter quelques instants et réessayer. Les modèles gratuits ont des limites de taux pour éviter les abus.';
        warningType = 'RATE_LIMIT';
      } else if (openRouterError?.message?.includes('OPENROUTER_AUTH')) {
        errorContent = 'Erreur d\'authentification avec le service IA. Veuillez contacter le support technique.';
        warningType = 'AUTH_ERROR';
      }

      const errorMessage = {
        id: `temp-${Date.now()}`,
        conversation_id: conversationIdToUse,
        role: 'assistant' as const,
        content: errorContent,
        created_at: new Date().toISOString(),
        ai_analysis: {
          error_details: {
            name: 'OpenRouterFailed',
            message: openRouterError?.message || 'Unknown error',
            openrouter_error: openRouterError?.message,
          },
          diagnostic_complete: false,
          needs_more_info: false,
        },
      };

      return NextResponse.json({
        success: false,
        conversationId: conversationIdToUse,
        message: errorMessage,
        userMessage: savedUserMessage,
        analysis: errorMessage.ai_analysis,
        suggestedQuestions: [],
        warnings: [warningType],
        error_details: errorMessage.ai_analysis.error_details,
      });
    }

    // 8. Enregistrer la réponse de l'IA
    const { data: aiMessage, error: aiMessageError } = await (supabaseAdminClient as any)
      .from('ai_chat_messages')
      .insert({
        conversation_id: conversationIdToUse,
        role: 'assistant',
        content: aiResponse.assistant_reply,
        ai_analysis: aiResponse.analysis,
      })
      .select()
      .single();

    if (aiMessageError || !aiMessage) {
      return NextResponse.json(
        { error: 'Failed to save AI message', details: aiMessageError?.message },
        { status: 500 }
      );
    }

    // 9. Mettre à jour la conversation
    await (supabaseAdminClient as any)
      .from('ai_chat_conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationIdToUse);

    // 10. Formater les questions suggérées
    const suggestedQuestions = (aiResponse.analysis.suggested_questions || []).map((q) => {
      if (typeof q === 'string') {
        return { question: q, options: [] };
      }
      return q;
    });

    // 11. Renvoyer la réponse au frontend
    return NextResponse.json({
      success: true,
      conversationId: conversationIdToUse,
      message: aiMessage,
      userMessage: savedUserMessage,
      analysis: aiResponse.analysis,
      suggestedQuestions,
      warnings: warnings.length > 0 ? warnings : [],
      error_details: aiResponse.analysis.error_details || null,
      provider, // Indiquer quel provider a été utilisé
    });

  } catch (err: any) {
    console.error('❌ Erreur dans POST /api/ai-chat:', {
      message: err?.message,
      stack: err?.stack,
      error: err,
    });

    return NextResponse.json(
      { 
        success: false, 
        error: "INTERNAL_ERROR", 
        details: err?.message || 'Unknown error',
        ...(process.env.NODE_ENV === 'development' ? { stack: err?.stack } : {}),
      },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { conversationId, userId } = body;

    if (!conversationId || !userId) {
      return NextResponse.json(
        { error: 'conversationId and userId are required' },
        { status: 400 }
      );
    }

    const supabaseAdminClient = getSupabaseAdmin();

    // Vérifier que l'utilisateur est propriétaire de la conversation
    const { data: flyAccount } = await (supabaseAdminClient as any)
      .from('fly_accounts')
      .select('id')
      .eq('auth_user_id', userId)
      .single();

    if (!flyAccount) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    const { data: conversation } = await (supabaseAdminClient as any)
      .from('ai_chat_conversations')
      .select('flynesis_user_id')
      .eq('id', conversationId)
      .single();

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    // Vérifier que l'utilisateur est propriétaire
    if (conversation.flynesis_user_id !== flyAccount.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Supprimer d'abord tous les messages de la conversation
    const { error: messagesError } = await (supabaseAdminClient as any)
      .from('ai_chat_messages')
      .delete()
      .eq('conversation_id', conversationId);

    if (messagesError) {
      return NextResponse.json(
        { error: 'Failed to delete messages', details: messagesError.message },
        { status: 500 }
      );
    }

    // Ensuite supprimer la conversation
    const { error: convError } = await (supabaseAdminClient as any)
      .from('ai_chat_conversations')
      .delete()
      .eq('id', conversationId);

    if (convError) {
      return NextResponse.json(
        { error: 'Failed to delete conversation', details: convError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Conversation deleted successfully',
    });

  } catch (err: any) {
    console.error('❌ Erreur dans DELETE /api/ai-chat:', err);
    return NextResponse.json(
      { 
        success: false, 
        error: "DELETE_ERROR", 
        details: err?.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
