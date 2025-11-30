import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse, NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const url = req.nextUrl;

  // Not logged in → dashboard → go home
  if (!user && url.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  // Logged in → on home → go to dashboard
  if (user && url.pathname === '/') {
    const { data } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    const role = data?.role || 'student';
    const map: Record<string, string> = {
      admin: '/dashboard/admin',
      teacher: '/dashboard/teacher',
      student: '/dashboard/student',
    };

    return NextResponse.redirect(new URL(map[role], req.url));
  }

  return res;
}

export const config = { matcher: ['/dashboard/:path*', '/'] };