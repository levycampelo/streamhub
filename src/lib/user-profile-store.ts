type AuthenticatedUserPayload = {
  email: string;
  name?: string | null;
  image?: string | null;
  provider: "google";
};

function getSupabaseAdminEnv(): { url: string; serviceRole: string } {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL)?.trim();
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !serviceRole) {
    throw new Error("SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY sao obrigatorios");
  }

  return { url, serviceRole };
}

async function supabaseAdminRequest(path: string, init: RequestInit): Promise<Response> {
  const { url, serviceRole } = getSupabaseAdminEnv();

  return fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: serviceRole,
      Authorization: `Bearer ${serviceRole}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });
}

export async function getUserPlan(email: string): Promise<string | null> {
  try {
    const response = await supabaseAdminRequest(
      `app_users?email=eq.${encodeURIComponent(email)}&select=plan&limit=1`,
      { method: "GET" },
    );
    if (!response.ok) return null;
    const rows = (await response.json()) as Array<{ plan?: string | null }>;
    return rows[0]?.plan ?? null;
  } catch {
    return null;
  }
}

export async function upsertAuthenticatedUser(payload: AuthenticatedUserPayload): Promise<void> {
  const now = new Date().toISOString();

  const body = [
    {
      email: payload.email,
      full_name: payload.name?.trim() || null,
      avatar_url: payload.image?.trim() || null,
      auth_provider: payload.provider,
      last_login_at: now,
      updated_at: now,
    },
  ];

  const response = await supabaseAdminRequest("app_users?on_conflict=email", {
    method: "POST",
    headers: {
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Falha ao salvar usuario autenticado: ${response.status} ${message}`);
  }
}
