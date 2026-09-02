import { NextRequest, NextResponse } from "next/server";

const BLOCKED_VERCEL_HOSTS = new Set(["duckmomo.vercel.app"]);

function isBlockedLegacyHost(hostHeader: string | null): boolean {
  const host = (hostHeader ?? "").split(":", 1)[0].trim().toLowerCase();
  if (BLOCKED_VERCEL_HOSTS.has(host)) {
    return true;
  }

  // Also close immutable preview URLs that belonged to the old Duckmomo
  // Vercel project. The HostAtom production domain is unaffected.
  return host.startsWith("duckmomo-") && host.endsWith(".vercel.app");
}

export function proxy(request: NextRequest) {
  if (!isBlockedLegacyHost(request.headers.get("host"))) {
    return NextResponse.next();
  }

  return new NextResponse(
    "Duckmomo has moved to https://callduckstore.com. This address is no longer available.",
    {
      status: 410,
      headers: {
        "Cache-Control": "no-store, max-age=0",
        "X-Robots-Tag": "noindex, nofollow, noarchive",
      },
    }
  );
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
