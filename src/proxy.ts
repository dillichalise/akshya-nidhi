import { NextResponse, type NextRequest } from "next/server";

// Cheap first gate only: unauthenticated visitors are sent to /login.
// Real authorization (valid token, active user, role) happens in the server layer.
export function proxy(request: NextRequest) {
  if (!request.cookies.has("session")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  // Everything except /login, Next internals and static files.
  matcher: ["/((?!login|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
