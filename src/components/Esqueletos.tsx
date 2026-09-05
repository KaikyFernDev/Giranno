import { cn } from "@/lib/utils";

/** Bloco cinza pulsando — nunca deixamos a tela em branco durante o carregamento. */
export function Bloco({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} />;
}

export function EsqueletoMetricas({ quantidade = 4 }: { quantidade?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: quantidade }).map((_, i) => (
        <div key={i} className="sombra-card rounded-xl border border-border bg-card p-5">
          <Bloco className="h-3.5 w-24" />
          <Bloco className="mt-4 h-9 w-20" />
          <Bloco className="mt-2 h-3 w-28" />
        </div>
      ))}
    </div>
  );
}

export function EsqueletoLista({ linhas = 5 }: { linhas?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: linhas }).map((_, i) => (
        <div
          key={i}
          className="sombra-card flex items-center gap-4 rounded-xl border border-border bg-card p-4"
        >
          <div className="flex-1 space-y-2">
            <Bloco className="h-4 w-1/3" />
            <Bloco className="h-3 w-1/4" />
          </div>
          <Bloco className="h-8 w-20" />
          <Bloco className="h-8 w-24" />
        </div>
      ))}
    </div>
  );
}
