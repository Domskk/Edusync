/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      // Your exact project avatars
      {
        protocol: 'https',
        hostname: 'dotyvqxizcrxlehjejop.supabase.co',
        pathname: '/storage/v1/object/public/avatars/**',
      },
      // All public buckets in your project (recommended)
      {
        protocol: 'https',
        hostname: 'dotyvqxizcrxlehjejop.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      // Optional: future-proof for any Supabase project  
      {
        protocol: 'https',
        hostname: '**',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },

  // Keep your custom headers if you need them
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Set-Cookie',
            value: 'supabase-auth-token=; Path=/; HttpOnly; Secure; SameSite=Lax',
          },
        ],
      },
    ];
  },
};

export default nextConfig;