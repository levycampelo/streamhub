"use client";
import React from "react";

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    // Você pode logar o erro em um serviço externo aqui
    if (typeof window !== "undefined") {
      console.error("ErrorBoundary:", error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ background: "#1a2236", color: "#ffb4b9", padding: 32, borderRadius: 16, margin: 32, textAlign: "center" }}>
          <h2>Ocorreu um erro inesperado 😢</h2>
          <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", marginTop: 16 }}>
            {String(this.state.error)}
          </pre>
          <p style={{ marginTop: 16 }}>Tente recarregar a página ou acessar de outro dispositivo.<br/>Se o erro persistir, envie um print desta tela para o suporte.</p>
        </div>
      );
    }
    return this.props.children;
  }
}
