import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Download, Printer } from "lucide-react";
import { useMemo } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { BadgeEstoque } from "@/components/BadgeEstoque";
import { EsqueletoLista } from "@/components/Esqueletos";
import { Button } from "@/components/ui/button";
import {
  baixarTexto,
  formatarDias,
  formatarNumero,
  gerarTextoReposicao,
  listaDeReposicao,
  sugestaoDeCompra,
} from "@/lib/estoque";
import { produtosQuery } from "@/lib/queries";

export const Route = createFileRoute("/reposicao")({
  head: () => ({
    meta: [
      { title: "Lista de reposição — o que comprar primeiro" },
      {
        name: "description",
        content:
          "Lista de compras ordenada por urgência, com quantidade sugerida para 30 dias. Exporte em texto ou PDF.",
      },
      { property: "og:title", content: "Lista de reposição — o que comprar primeiro" },
      {
        property: "og:description",
        content: "Compras ordenadas por urgência, com quantidade sugerida e exportação.",
      },
    ],
  }),
  component: PaginaReposicao,
});

function PaginaReposicao() {
  const { data: produtos, isPending, isError, error } = useQuery(produtosQuery);
  const lista = useMemo(() => listaDeReposicao(produtos ?? []), [produtos]);

  const exportarTexto = () => {
    baixarTexto(
      `reposicao-${new Date().toISOString().slice(0, 10)}.txt`,
      gerarTextoReposicao(lista),
    );
    toast.success("Arquivo de texto baixado");
  };

  const exportarPdf = () => {
    toast.info("Escolha “Salvar como PDF” na janela de impressão");
    window.setTimeout(() => window.print(), 350);
  };

  return (
    <AppShell
      titulo="Lista de reposição"
      descricao="Quem acaba primeiro aparece no topo. A quantidade sugerida cobre 30 dias de venda."
      acoes={
        <>
          <Button variant="outline" onClick={exportarTexto} disabled={isPending}>
            <Download className="size-4" aria-hidden="true" />
            Baixar texto
          </Button>
          <Button onClick={exportarPdf} disabled={isPending}>
            <Printer className="size-4" aria-hidden="true" />
            Salvar em PDF
          </Button>
        </>
      }
    >
      {isError ? (
        <p
          role="alert"
          className="rounded-xl border border-critico/25 bg-critico-suave p-4 text-corpo text-critico"
        >
          Não foi possível carregar a lista: {(error as Error).message}
        </p>
      ) : isPending ? (
        <EsqueletoLista linhas={5} />
      ) : lista.length === 0 ? (
        <div className="sombra-card rounded-xl border border-border bg-card p-10 text-center">
          <h2 className="text-titulo font-semibold">Nada para repor agora</h2>
          <p className="mt-2 text-corpo text-muted-foreground">
            Nenhum produto está abaixo do mínimo nem deve acabar nos próximos 7 dias.
          </p>
        </div>
      ) : (
        <div className="area-impressao sombra-card overflow-hidden rounded-xl border border-border bg-card">
          <table className="w-full border-collapse text-corpo">
            <caption className="sr-only">
              Produtos que precisam de reposição, ordenados por dias restantes
            </caption>
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left text-rotulo text-muted-foreground">
                <th scope="col" className="px-4 py-3 font-semibold">
                  Produto
                </th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">
                  Estoque
                </th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">
                  Giro/dia
                </th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">
                  Dura
                </th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">
                  Comprar
                </th>
                <th scope="col" className="nao-imprimir px-4 py-3 font-semibold">
                  Situação
                </th>
              </tr>
            </thead>
            <tbody>
              {lista.map((p, i) => (
                <tr
                  key={p.id}
                  className="entrada-card border-b border-border last:border-0 transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-[var(--shadow-flutuante)]"
                  style={{ animationDelay: `${Math.min(i, 12) * 40}ms` }}
                >
                  <td className="px-4 py-3">
                    <p className="font-semibold">{p.nome}</p>
                    <p className="text-rotulo text-muted-foreground">
                      {p.categoria}
                      {p.sku ? ` · ${p.sku}` : ""}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-right tabular">
                    {formatarNumero(p.estoque_atual)}
                  </td>
                  <td className="px-4 py-3 text-right tabular">
                    {formatarNumero(p.giro_medio_diario, 2)}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-critico tabular">
                    {formatarDias(p)}
                  </td>
                  <td className="px-4 py-3 text-right font-bold tabular">
                    {formatarNumero(sugestaoDeCompra(p))}
                  </td>
                  <td className="nao-imprimir px-4 py-3">
                    <BadgeEstoque produto={p} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}
