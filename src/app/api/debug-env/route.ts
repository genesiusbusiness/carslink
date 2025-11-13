import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  // Sécurité : Ne pas exposer toutes les variables en production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  const envCheck = {
    SUPABASE_SERVICE_ROLE_KEY: {
      exists: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      length: process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0,
      prefix: process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 20) || 'NOT_SET',
    },
    OPENROUTER_API_KEY: {
      exists: !!process.env.OPENROUTER_API_KEY,
      length: process.env.OPENROUTER_API_KEY?.length || 0,
      prefix: process.env.OPENROUTER_API_KEY?.substring(0, 20) || 'NOT_SET',
    },
    NEXT_PUBLIC_SUPABASE_URL: {
      exists: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      value: process.env.NEXT_PUBLIC_SUPABASE_URL || 'NOT_SET',
    },
    // Liste toutes les variables qui contiennent SUPABASE ou OPENROUTER
    allSupabaseVars: Object.keys(process.env)
      .filter(k => k.includes('SUPABASE') || k.includes('OPENROUTER'))
      .map(k => ({
        name: k,
        exists: true,
        length: process.env[k]?.length || 0,
      })),
  };

  return NextResponse.json({
    success: true,
    environment: process.env.NODE_ENV,
    variables: envCheck,
    message: isDevelopment 
      ? "Full environment check (development mode)"
      : "Environment variables check (production mode - values hidden)",
  });
}

