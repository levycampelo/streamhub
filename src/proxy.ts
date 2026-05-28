import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
});

export const config = {
  matcher: [
    "/watchlist/:path*",
    "/deep-links/:path*",
    "/concierge/:path*",
    "/api/concierge/:path*",
    "/api/subscriptions/:path*",
    "/api/alerts/economy/:path*",
  ],
};
