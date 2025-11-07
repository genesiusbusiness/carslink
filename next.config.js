/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['localhost', 'yxkbvhymsvasknslhpsa.supabase.co'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },
  // Configuration explicite pour la résolution des modules
  webpack: (config, { isServer }) => {
    // S'assurer que les alias sont correctement résolus
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': require('path').resolve(__dirname, 'src'),
    }
    return config
  },
}

module.exports = nextConfig

