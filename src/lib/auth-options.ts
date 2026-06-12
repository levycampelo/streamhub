import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { getUserPlan, upsertAuthenticatedUser } from "@/lib/user-profile-store";

async function persistGoogleUser(params: {
  email?: string | null;
  name?: string | null;
  image?: string | null;
  provider?: string | null;
}): Promise<void> {
  const { email, name, image, provider } = params;

  if (provider !== "google") {
    return;
  }

  const normalizedEmail = email?.trim();
  if (!normalizedEmail) {
    throw new Error("Usuario Google sem email valido");
  }

  await upsertAuthenticatedUser({
    email: normalizedEmail,
    name,
    image,
    provider: "google",
  });
}

if (!process.env.AUTH_SECRET && process.env.NODE_ENV === "production") {
  throw new Error("AUTH_SECRET precisa estar configurado em producao.");
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.AUTH_GOOGLE_ID ?? "",
      clientSecret: process.env.AUTH_GOOGLE_SECRET ?? "",
    }),
  ],
  pages: {
    signIn: "/login",
  },
  secret: process.env.AUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  events: {
    async signIn({ user, account }) {
      try {
        await persistGoogleUser({
          email: user?.email,
          name: user?.name,
          image: user?.image,
          provider: account?.provider,
        });
      } catch (error) {
        console.error("Falha ao persistir usuario no events.signIn", {
          error,
          hasSupabaseUrl: Boolean(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL),
          hasServiceRole: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
          provider: account?.provider,
          email: user?.email,
        });
      }
    },
  },
  callbacks: {
    async signIn({ user, account }) {
      try {
        await persistGoogleUser({
          email: user?.email,
          name: user?.name,
          image: user?.image,
          provider: account?.provider,
        });
      } catch (error) {
        // Authentication should not fail due to temporary persistence errors.
        console.error("Nao foi possivel persistir usuario autenticado no callbacks.signIn", {
          error,
          hasSupabaseUrl: Boolean(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL),
          hasServiceRole: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
          provider: account?.provider,
          email: user?.email,
        });
      }

      return true;
    },
    async jwt({ token, user, trigger }) {
      // On first sign-in, fetch the plan from Supabase
      if ((trigger === "signIn" || trigger === "signUp") && user?.email) {
        token.plan = await getUserPlan(user.email);
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { plan?: string | null }).plan = (token.plan as string | null) ?? null;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) {
        return `${baseUrl}${url}`;
      }

      if (url.startsWith(baseUrl)) {
        return url;
      }

      return `${baseUrl}/`;
    },
  },
};
