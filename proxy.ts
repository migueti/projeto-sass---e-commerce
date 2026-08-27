import { withAuth } from "next-auth/middleware";

export default withAuth;

export const publicRoutePattern =
  "login(?:/|$)|cadastro(?:/|$)|api/auth(?:/|$)|api/payments/webhook(?:/|$)|_next/static(?:/|$)|_next/image(?:/|$)|favicon\\.ico$";
export const protectedRouteMatcher = `/((?!${publicRoutePattern}).*)`;

export const config = {
  matcher: [protectedRouteMatcher],
};