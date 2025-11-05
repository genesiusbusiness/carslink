/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Export statique pour Capacitor (mobile)
  output: 'export',
  images: {
    unoptimized: true, // Nécessaire pour l'export statique
    domains: ['localhost', 'yxkbvhymsvasknslhpsa.supabase.co'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },
  // Trailing slash pour les routes
  trailingSlash: true,
}

module.exports = nextConfig

