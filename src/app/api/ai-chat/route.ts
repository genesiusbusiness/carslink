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
      throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set in environment variables')
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
  const state = {
    user_profile: profile || {},
    vehicles: vehicles || [],
    history: history || [],
    last_user_message: lastUserMessage,
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

Tu peux aussi demander des informations complémentaires sous forme de questions simples. 

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
      "question simple" 
      OU { "question": "string", "options": ["option 1", "option 2", ...] }
    ],
    "is_greeting": boolean,
    "error_details": null OU { "name": "string", "message": "string", "stack": "string", ... }
  }
}

- Si tu es sûr d'un type de prestation adapté, mets diagnostic_complete = true et needs_more_info = false.
- Si tu as besoin de plus d'infos, mets diagnostic_complete = false, needs_more_info = true et remplis suggested_questions.
- Si le message de l'utilisateur est juste une salutation (ex: 'Bonjour') sans symptôme, tu peux répondre avec is_greeting = true et diagnostic_complete = false.

Tu n'as PAS le droit d'inclure ta réflexion interne, uniquement ce JSON final.`;

  // Construire les messages pour OpenRouter
  const messages = [
    { role: 'system' as const, content: systemPrompt },
    ...history,
    { role: 'user' as const, content: `STATE: ${stateJson}` },
  ];

  try {
    const result = await callOpenRouterChat({ messages, model });
    const content = result.content || '';

    // Essayer de parser le JSON de la réponse
    try {
      let jsonContent = content.trim();
      jsonContent = jsonContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      const jsonMatch = jsonContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed: ParsedAIResponse = JSON.parse(jsonMatch[0]);
        return parsed;
      }
      
      throw new Error('No JSON found in response');
    } catch (parseError) {
      console.error('❌ Erreur lors du parsing JSON de la réponse OpenRouter:', parseError);
      console.error('📄 Contenu brut reçu:', content.substring(0, 500));
      
      return {
        assistant_reply: "Je rencontre un problème technique pour analyser votre demande pour le moment. Veuillez réessayer plus tard.",
        analysis: {
          error_details: {
            name: 'JSONParseError',
            message: 'Invalid JSON from OpenRouter model',
            raw: content.substring(0, 1000),
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

    // 2. Gérer la conversation (créer ou récupérer)
    let conversationIdToUse = conversationId;
    
    if (!conversationIdToUse) {
      // Créer une nouvelle conversation
      const { data: newConversation, error: convError } = await (supabaseAdminClient as any)
        .from('ai_chat_conversations')
        .insert({
          flynesis_user_id: flyAccount.id,
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
        .select('flynesis_user_id')
        .eq('id', conversationIdToUse)
        .single();

      if (convCheckError || !existingConversation) {
        // Si la conversation n'existe pas, en créer une nouvelle
        const { data: newConversation, error: convError } = await (supabaseAdminClient as any)
          .from('ai_chat_conversations')
          .insert({
            flynesis_user_id: flyAccount.id,
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
      }
    }

    // 3. Insérer le message utilisateur
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

    // 4. Charger l'historique de conversation (derniers 20 messages)
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

    // 5. Préparer le profil (utiliser celui du frontend si fourni, sinon celui de la DB)
    const userProfile = profile || {
      first_name: flyAccount.first_name,
      last_name: flyAccount.last_name,
      email: flyAccount.email,
      phone: flyAccount.phone,
    };

    // 6. Construire le STATE JSON
    const stateJson = buildStateJson(
      userProfile,
      vehicles || [],
      chatHistory,
      message
    );

    // 7. Appeler OpenRouter
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

      const errorMessage = {
        id: `temp-${Date.now()}`,
        conversation_id: conversationIdToUse,
        role: 'assistant' as const,
        content: 'Le service de diagnostic IA est temporairement indisponible. Veuillez réessayer plus tard.',
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
        warnings: ['OPENROUTER_UNAVAILABLE'],
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
