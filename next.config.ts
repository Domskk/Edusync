const nextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Set-Cookie', value: 'supabase-auth-token=; Path=/; HttpOnly; Secure; SameSite=Lax' },
        ],
      },
    ];
  },
};

export default nextConfig;