import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(req: NextRequest) {
  const url = req.nextUrl;
  const hostname = req.headers.get('host') || '';

  // Avoid rewriting if it's already an internal path that shouldn't be touched
  if (url.pathname.startsWith('/_next') || url.pathname.startsWith('/api') || url.pathname.includes('.')) {
    return NextResponse.next();
  }

  // Admin routing
  if (hostname.startsWith('admin.')) {
    // If the path isn't already prefixed with /admin, rewrite it
    if (!url.pathname.startsWith('/admin')) {
      return NextResponse.rewrite(new URL(`/admin${url.pathname}`, req.url));
    }
  } 
  // Agency routing (handling both agency and agnecy typos)
  else if (hostname.startsWith('agency.') || hostname.startsWith('agnecy.')) {
    // If the path isn't already prefixed with /agencytripdm, rewrite it
    if (!url.pathname.startsWith('/agencytripdm')) {
      return NextResponse.rewrite(new URL(`/agencytripdm${url.pathname}`, req.url));
    }
  }

  return NextResponse.next();
}
