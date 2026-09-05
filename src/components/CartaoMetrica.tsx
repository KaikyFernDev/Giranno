import type { LucideIcon } from "lucide-react";

import { NumeroAnimado } from "@/components/NumeroAnimado";
import { cn } from "@/lib/utils";

export interface CartaoMetricaProps {
  rotulo: string;
  valor: number;
  /** Índice na grade — controla o atraso da entrada escalonada. */
  ordem?: number;
  casas?: number;
  sufixo?: string;
  prefixo?: string;

  /** Texto de apoio abaixo do número. */
  detalhe?: string;
  Icone?: LucideIcon;
  /** Destaca o cartão como alerta crítico. */
  critico?: boolean;
  className?: string;
}

/**
 * Cartão de número grande do painel. Cada cartão entra 80ms depois do
 * anterior, criando uma cascata curta em vez de tudo aparecer de uma vez.
 */
export function CartaoMetrica({
  rotulo,
  valor,
  ordem = 0,
  casas = 0,
  sufixo,
  prefixo,

  detalhe,
  Icone,
  critico = false,
  className,
}: CartaoMetricaProps) {
  return (
    <div
      className={cn(
        "entrada-card flutuar rounded-xl border bg-card p-5",
        critico ? "border-critico/25" : "border-border",
        className,
      )}
      style={{ animationDelay: `${ordem * 80}ms` }}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-rotulo font-semibold text-muted-foreground">{rotulo}</p>
        {Icone ? (
          <Icone
            className={cn("size-4 shrink-0", critico ? "text-critico" : "text-muted-foreground")}
            aria-hidden="true"
          />
        ) : null}
      </div>

      <p
        className={cn(
          "mt-3 text-numero font-bold",
          critico ? "text-critico" : "text-foreground",
        )}
      >
        <NumeroAnimado valor={valor} casas={casas} {...(sufixo ? { sufixo } : {})} />
      </p>

      {detalhe ? <p className="mt-1 text-rotulo text-muted-foreground">{detalhe}</p> : null}
    </div>
  );
}
