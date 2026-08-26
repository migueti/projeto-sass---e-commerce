import { withAuth } from "next-auth/middleware";

export default withAuth;

export const config = {
  matcher: ["/((?!login|cadastro|api/auth|_next/static|_next/image|favicon.ico).*)"],
};