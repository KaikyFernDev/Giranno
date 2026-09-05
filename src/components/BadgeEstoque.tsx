import { AlertTriangle, Check, Moon, TrendingDown } from "lucide-react";

import type { ProdutoComMetricas, StatusEstoque } from "@/lib/estoque";
import { classificarEstoque, formatarDias } from "@/lib/estoque";
import { cn } from "@/lib/utils";

const APARENCIA: Record<
  StatusEstoque,
  { rotulo: string; classe: string; Icone: typeof AlertTriangle; pulsa: boolean }
> = {
  critico: {
    rotulo: "Repor já",
    classe: "bg-critico-suave text-critico border-critico/25",
    Icone: AlertTriangle,
    pulsa: true,
  },
  atencao: {
    rotulo: "Atenção",
    classe: "bg-secondary text-secondary-foreground border-border",
    Icone: TrendingDown,
    pulsa: false,
  },
  parado: {
    rotulo: "Parado",
    classe: "bg-muted text-muted-foreground border-border",
    Icone: Moon,
    pulsa: false,
  },
  saudavel: {
    rotulo: "Saudável",
    classe: "bg-accent text-accent-foreground border-transparent",
    Icone: Check,
    pulsa: false,
  },
};

export interface BadgeEstoqueProps {
  produto: ProdutoComMetricas;
  /** Acrescenta os dias restantes ao lado do rótulo. */
  mostrarDias?: boolean;
  className?: string;
}

/**
 * Selo de situação do estoque. Só o estado crítico pulsa — se tudo piscasse,
 * nada chamaria atenção.
 */
export function BadgeEstoque({ produto, mostrarDias = false, className }: BadgeEstoqueProps) {
  const status = classificarEstoque(produto);
  const { rotulo, classe, Icone, pulsa } = APARENCIA[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-rotulo font-semibold",
        classe,
        pulsa && "pulso-alerta",
        className,
      )}
    >
      <Icone className="size-3.5 shrink-0" aria-hidden="true" />
      {mostrarDias && status !== "parado" ? `${rotulo} · ${formatarDias(produto)}` : rotulo}
    </span>
  );
}
