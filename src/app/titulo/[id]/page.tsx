import { Metadata } from "next";
import { notFound } from "next/navigation";

// Simulacao - substitua pelo seu fetch real do TMDB/Omdb no futuro
async function getObraData(id: string) {
  // Isso deve fazer fetch no TMDB ou na sua propria api local
  return {
    id,
    title: `Obra ${id}`,
    description: "Sinopse do filme ou série. Esta página é gerada dinamicamente para SEO.",
    imageUrl: "/logos/icon-512x512.png", // Imagem temporária
  };
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const data = await getObraData(params.id);
  
  if (!data) return { title: "Não encontrado" };

  return {
    title: `Onde assistir ${data.title}`,
    description: data.description,
    openGraph: {
      title: `Onde assistir ${data.title}`,
      description: data.description,
      images: [data.imageUrl],
    },
  };
}

export default async function TituloPage({ params }: { params: { id: string } }) {
  const data = await getObraData(params.id);

  if (!data) notFound();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row gap-8">
        <div className="w-full md:w-1/3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src={data.imageUrl} 
            alt={`Poster de ${data.title}`} 
            className="w-full rounded-lg shadow-lg object-cover bg-neutral-800 aspect-[2/3]"
          />
        </div>
        
        <div className="w-full md:w-2/3">
          <h1 className="text-4xl font-bold font-heading mb-4">{data.title}</h1>
          <p className="text-lg text-neutral-300 mb-8">{data.description}</p>
          
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
            <h2 className="text-2xl font-semibold mb-4">Onde Assistir</h2>
            {/* Aqui você integrará os seus Deep Links reais */}
            <div className="text-neutral-400">
               Integrar com os dados do TMDB/JustWatch para este ID e listar os botões de streaming aqui...
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
