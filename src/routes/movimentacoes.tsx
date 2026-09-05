import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { useMemo, useState } from "react";

import { AppShell } from "@/components/AppShell";
import { EsqueletoLista } from "@/components/Esqueletos";
import { formatarData, formatarNumero } from "@/lib/estoque";
import { movimentacoesQuery } from "@/lib/queries";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/movimentacoes")({
  head: () => ({
    meta: [
      { title: "Movimentações — Giranno" },
      {
        name: "description",
        content:
          "Histórico completo de entradas e saídas do estoque, com data, quantidade e observação de cada registro.",
      },
      { property: "og:title", content: "Movimentações — Giranno" },
      {
        property: "og:description",
        content: "Todo o histórico de entradas e saídas, com data, quantidade e observação.",
      },
    ],
  }),
  component: PaginaMovimentacoes,
});

type FiltroTipo = "todas" | "entrada" | "saida";

function PaginaMovimentacoes() {
  const { data, isPending, isError, error } = useQuery(movimentacoesQuery);
  const [filtro, setFiltro] = useState<FiltroTipo>("todas");

  const visiveis = useMemo(
    () => (data ?? []).filter((m) => filtro === "todas" || m.tipo === filtro),
    [data, filtro],
  );

  return (
    <AppShell titulo="Movimentações" descricao="Os 300 registros mais recentes.">
      <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Filtrar movimentações">
        {(
          [
            { valor: "todas", rotulo: "Todas" },
            { valor: "entrada", rotulo: "Entradas" },
            { valor: "saida", rotulo: "Saídas" },
          ] as const
        ).map(({ valor, rotulo }) => (
          <button
            key={valor}
            type="button"
            aria-pressed={filtro === valor}
            onClick={() => setFiltro(valor)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-rotulo font-medium transition-colors",
              filtro === valor
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:bg-accent",
            )}
          >
            {rotulo}
          </button>
        ))}
      </div>

      {isError ? (
        <p
          role="alert"
          className="rounded-xl border border-critico/25 bg-critico-suave p-4 text-corpo text-critico"
        >
          Não foi possível carregar o histórico: {(error as Error).message}
        </p>
      ) : isPending ? (
        <EsqueletoLista linhas={6} />
      ) : visiveis.length === 0 ? (
        <div className="sombra-card rounded-xl border border-border bg-card p-10 text-center">
          <p className="text-corpo text-muted-foreground">
            Nenhuma movimentação registrada por aqui ainda.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {visiveis.map((m, i) => {
            const entrada = m.tipo === "entrada";
            const Icone = entrada ? ArrowDownToLine : ArrowUpFromLine;

            return (
              <li
                key={m.id}
                className="entrada-card flutuar flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-4"
                style={{ animationDelay: `${Math.min(i, 12) * 40}ms` }}
              >
                <span
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-full",
                    entrada ? "bg-accent text-accent-foreground" : "bg-muted text-foreground",
                  )}
                >
                  <Icone className="size-4" aria-hidden="true" />
                </span>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-corpo font-semibold">
                    {m.produtos?.nome ?? "Produto removido"}
                  </p>
                  <p className="truncate text-rotulo text-muted-foreground">
                    {formatarData(m.data)}
                    {m.observacao ? ` · ${m.observacao}` : ""}
                  </p>
                </div>

                <span className="shrink-0 text-corpo font-bold tabular">
                  {entrada ? "+" : "−"}
                  {formatarNumero(m.quantidade)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </AppShell>
  );
}
