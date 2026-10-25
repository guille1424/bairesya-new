// Redirecciones optimistas según la cookie de sesión. La verificación real ocurre en el DAL.
import { NextResponse, type NextRequest } from "next/server";
import { CUSTOMER_COOKIE, STAFF_COOKIE, verifySession } from "@/lib/auth/token";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin")) {
    const staff = await verifySession(request.cookies.get(STAFF_COOKIE)?.value, "staff");
    const isLogin = pathname === "/admin/login";
    if (!staff && !isLogin) {
      return NextResponse.redirect(new URL("/admin/login", request.nextUrl));
    }
    if (staff && isLogin) {
      return NextResponse.redirect(new URL("/admin", request.nextUrl));
    }
  }

  if (pathname.startsWith("/mi-cuenta")) {
    const customer = await verifySession(request.cookies.get(CUSTOMER_COOKIE)?.value, "customer");
    if (!customer) {
      return NextResponse.redirect(new URL("/ingresar?next=/mi-cuenta", request.nextUrl));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/mi-cuenta/:path*"],
};
