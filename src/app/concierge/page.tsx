"use client";

import { NavBar } from "@/components/nav-bar";
import { useState, useRef, useEffect, FormEvent } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function ConciergePage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    const userMessage: Message = { role: "user", content: text };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/concierge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updatedMessages }),
      });

      const data = await res.json();

      if (!res.ok) {
        const fallbackText = data.fallback ? `\n\nSugestao local:\n${data.fallback}` : "";
        setMessages([
          ...updatedMessages,
          {
            role: "assistant",
            content: `${data.error ?? "Erro ao obter resposta."}${fallbackText}`,
          },
        ]);
        return;
      }

      setMessages([
        ...updatedMessages,
        { role: "assistant", content: data.reply },
      ]);
    } catch {
      setMessages([
        ...updatedMessages,
        { role: "assistant", content: "Erro de conexão. Tente novamente." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen pb-12">
      <NavBar />

      <section className="mx-auto max-w-4xl px-4">
        <div className="card section-enter p-6">
          <h2 className="text-2xl font-semibold">IA Concierge</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Pergunte: o que assistir, o que cancelar, como economizar.
          </p>

          <div className="mt-5 max-h-[60vh] space-y-3 overflow-y-auto">
            {messages.length === 0 && (
              <p className="text-center text-sm text-[var(--muted)]">
                Envie uma mensagem para começar.
              </p>
            )}
            {messages.map((message, idx) => (
              <div
                key={`${message.role}-${idx}`}
                className={`rounded-2xl p-4 ${
                  message.role === "assistant"
                    ? "border border-[#28497f] bg-[#0f1c33]"
                    : "border border-[var(--line)] bg-[#0b1324]"
                }`}
              >
                <p className="text-xs uppercase tracking-[0.15em] text-[#89a4cb]">
                  {message.role === "assistant" ? "ai" : "you"}
                </p>
                <p className="mt-1 whitespace-pre-wrap">{message.content}</p>
              </div>
            ))}
            {loading && (
              <div className="rounded-2xl border border-[#28497f] bg-[#0f1c33] p-4">
                <p className="text-xs uppercase tracking-[0.15em] text-[#89a4cb]">ai</p>
                <p className="mt-1 animate-pulse">Pensando...</p>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
            <input
              className="input"
              placeholder="Ex: vale cancelar Netflix este mês?"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
            />
            <button className="btn" type="submit" disabled={loading}>
              Enviar
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
