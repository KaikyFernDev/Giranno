import type { ComponentProps } from "react";

import { useCountUp } from "@/hooks/use-count-up";
import { formatarNumero } from "@/lib/estoque";
import { cn } from "@/lib/utils";

export interface NumeroAnimadoProps extends ComponentProps<"span"> {
  /** Valor final a exibir. */
  valor: number;
  /** Casas decimais na exibição. */
  casas?: number;
  /** Texto colado após o número, como "un." ou "dias". */
  sufixo?: string;
  /** Desliga a animação (útil em tabelas densas). */
  estatico?: boolean;
}

/**
 * Número que transiciona por contagem em vez de trocar de uma vez.
 * `tabular` mantém a largura dos dígitos estável durante a animação.
 */
export function NumeroAnimado({
  valor,
  casas = 0,
  sufixo,
  estatico = false,
  className,
  ...props
}: NumeroAnimadoProps) {
  const animado = useCountUp(valor);
  const exibir = estatico ? valor : animado;

  return (
    <span className={cn("tabular", className)} {...props}>
      {formatarNumero(exibir, casas)}
      {sufixo ? <span className="ml-1 text-rotulo font-medium">{sufixo}</span> : null}
    </span>
  );
}
