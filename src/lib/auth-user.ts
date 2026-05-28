import { authOptions } from "@/lib/auth-options";
import { getServerSession } from "next-auth";

export async function getAuthenticatedUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return null;
  }

  return session.user.email ?? session.user.name ?? null;
}
