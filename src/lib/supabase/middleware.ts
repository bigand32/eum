import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAnonKey, getSupabaseUrl, isSupabaseConfigured } from "./config";

function isAuthRoute(pathname: string) {
  return pathname.startsWith("/login") || pathname.startsWith("/signup");
}

function getHomePathForRole(role: string | undefined) {
  return role === "master" ? "/master" : "/";
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  if (!isSupabaseConfigured()) {
    return response;
  }

  const supabase = createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (user && pathname === "/login") {
    const role = user.user_metadata?.role as string | undefined;
    return NextResponse.redirect(new URL(getHomePathForRole(role), request.url));
  }

  if (!user && !isAuthRoute(pathname) && !pathname.startsWith("/api")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // /master 역할 검사는 AuthGuard + DB masterId 로 처리
  // (user_metadata.role 캐시가 어긋나도 진입 가능해야 함)

  return response;
}
