import { getAuthenticatedUserId } from "@/lib/auth-user";
import { notFound } from "next/navigation";

// Simulação de banco de dados
async function getUserProfile(username: string) {
  // Simulando que encontrou a Maria
  if (username === "maria123") {
    return {
      name: "Maria Silva",
      username: "maria123",
      watchlist: [
        { id: "1", title: "O Auto da Compadecida", type: "Filme" },
        { id: "2", title: "Breaking Bad", type: "Série" }
      ]
    };
  }
  return null;
}

export default async function PerfilPublicoPage({ params }: { params: { username: string } }) {
  const profile = await getUserProfile(params.username);

  if (!profile) notFound();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-8 max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Perfil de {profile.name}</h1>
        <p className="text-neutral-400 mb-8">@{profile.username}</p>
        
        <h2 className="text-xl font-semibold border-b border-neutral-800 pb-2 mb-4">
          Watchlist Pública
        </h2>
        
        <ul className="space-y-3">
          {profile.watchlist.map((item) => (
            <li key={item.id} className="bg-neutral-800 p-4 rounded-lg flex justify-between items-center">
              <span className="font-medium text-lg">{item.title}</span>
              <span className="text-sm px-3 py-1 bg-neutral-700 rounded-full">{item.type}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
