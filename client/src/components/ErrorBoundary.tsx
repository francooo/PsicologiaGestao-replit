import { Component, type ErrorInfo, type ReactNode } from "react";
import { CircleAlert, RotateCw } from "lucide-react";

/**
 * Last line of defense: a render error shows this card instead of a blank page.
 * "removeChild/insertBefore … not a child" is the DOM rewritten under React, almost always by the
 * browser's automatic translation, so the card says how to turn it off.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Erro na tela:", error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    const domRewritten = error.name === "NotFoundError" || /not a child of this node/i.test(error.message);

    return (
      <div className="flex min-h-screen items-center justify-center bg-cp-bg px-4" translate="no">
        <div className="w-full max-w-md rounded-2xl border border-cp-divider bg-white p-6 shadow-[0_10px_40px_-18px_rgba(31,51,71,0.18)]">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-cp-danger-soft text-cp-danger">
            <CircleAlert className="h-5 w-5" />
          </span>
          <h1 className="mt-4 text-[20px] font-semibold text-cp-ink">Algo deu errado nesta tela</h1>
          <p className="mt-2 text-[15px] leading-relaxed text-cp-muted">
            Recarregue a página para continuar. O que já estava salvo não foi perdido.
          </p>
          {domRewritten && (
            <p className="mt-3 rounded-xl bg-cp-warning-soft px-4 py-3 text-[14px] leading-relaxed text-cp-ink">
              Se o tradutor do navegador estiver ligado, desligue para este site: clique no ícone de tradução na barra de
              endereço e escolha <strong>Nunca traduzir este site</strong>.
            </p>
          )}
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-cp-action px-5 text-[15px] font-medium text-white hover:opacity-90"
            >
              <RotateCw className="h-4 w-4" />
              Recarregar página
            </button>
            <button
              type="button"
              onClick={() => window.location.assign("/")}
              className="inline-flex h-11 items-center rounded-xl border border-cp-border bg-white px-5 text-[15px] font-medium text-cp-ink hover:bg-cp-hover"
            >
              Ir para o início
            </button>
          </div>
        </div>
      </div>
    );
  }
}
