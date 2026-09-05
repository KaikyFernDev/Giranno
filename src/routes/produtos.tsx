import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { AppShell } from "@/components/AppShell";
import { CartaoProduto } from "@/components/CartaoProduto";
import { DialogMovimentacao } from "@/components/DialogMovimentacao";
import { DialogProduto } from "@/components/DialogProduto";
import { EsqueletoLista } from "@/components/Esqueletos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  classificarEstoque,
  type ProdutoComMetricas,
  type TipoMovimentacao,
} from "@/lib/estoque";
import { produtosQuery, useApagarProduto } from "@/lib/queries";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/produtos")({
  head: () => ({
    meta: [
      { title: "Produtos — Giranno" },
      {
        name: "description",
        content:
          "Cadastre produtos, busque por nome ou código, filtre por categoria e registre entradas e saídas em poucos cliques.",
      },
      { property: "og:title", content: "Produtos — Giranno" },
      {
        property: "og:description",
        content: "Cadastro, busca por categoria e registro rápido de entradas e saídas.",
      },
    ],
  }),
  component: PaginaProdutos,
});

function PaginaProdutos() {
  const { data: produtos, isPending, isError, error } = useQuery(produtosQuery);
  const apagar = useApagarProduto();

  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState<string>("todas");
  const [somenteAlerta, setSomenteAlerta] = useState(false);
  const [formAberto, setFormAberto] = useState(false);
  const [emEdicao, setEmEdicao] = useState<ProdutoComMetricas | null>(null);
  const [movimentando, setMovimentando] = useState<{
    produto: ProdutoComMetricas;
    tipo: TipoMovimentacao;
  } | null>(null);

  const categorias = useMemo(
    () => Array.from(new Set((produtos ?? []).map((p) => p.categoria))).sort(),
    [produtos],
  );

  const visiveis = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return (produtos ?? []).filter((p) => {
      if (categoria !== "todas" && p.categoria !== categoria) return false;
      if (somenteAlerta && classificarEstoque(p) !== "critico") return false;
      if (!termo) return true;
      return (
        p.nome.toLowerCase().includes(termo) || (p.sku ?? "").toLowerCase().includes(termo)
      );
    });
  }, [produtos, busca, categoria, somenteAlerta]);

  const abrirNovo = () => {
    setEmEdicao(null);
    setFormAberto(true);
  };

  return (
    <AppShell
      titulo="Produtos"
      descricao="Cadastre, busque e movimente o estoque."
      acoes={
        <Button onClick={abrirNovo}>
          <Plus className="size-4" aria-hidden="true" />
          Novo produto
        </Button>
      }
    >
      <div className="mb-6 space-y-3">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome ou código"
            aria-label="Buscar produtos"
            className="pl-9"
          />
        </div>

        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por categoria">
          <Filtro ativo={categoria === "todas"} onClick={() => setCategoria("todas")}>
            Todas
          </Filtro>
          {categorias.map((c) => (
            <Filtro key={c} ativo={categoria === c} onClick={() => setCategoria(c)}>
              {c}
            </Filtro>
          ))}
          <Filtro
            ativo={somenteAlerta}
            onClick={() => setSomenteAlerta((v) => !v)}
            className="ml-auto"
          >
            Só os críticos
          </Filtro>
        </div>
      </div>

      {isError ? (
        <p
          role="alert"
          className="rounded-xl border border-critico/25 bg-critico-suave p-4 text-corpo text-critico"
        >
          Não foi possível carregar os produtos: {(error as Error).message}
        </p>
      ) : isPending ? (
        <EsqueletoLista linhas={6} />
      ) : visiveis.length === 0 ? (
        <div className="sombra-card rounded-xl border border-border bg-card p-10 text-center">
          <p className="text-corpo text-muted-foreground">
            {(produtos ?? []).length === 0
              ? "Nenhum produto cadastrado ainda."
              : "Nenhum produto corresponde a essa busca."}
          </p>
          {(produtos ?? []).length === 0 ? (
            <Button className="mt-4" onClick={abrirNovo}>
              Cadastrar produto
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visiveis.map((p, i) => (
            <CartaoProduto
              key={p.id}
              produto={p}
              ordem={i}
              aoMovimentar={(produto, tipo) => setMovimentando({ produto, tipo })}
              aoEditar={(produto) => {
                setEmEdicao(produto);
                setFormAberto(true);
              }}
              aoApagar={(id) => apagar.mutate(id)}
            />
          ))}
        </div>
      )}

      <DialogProduto
        aberto={formAberto}
        aoFechar={() => setFormAberto(false)}
        produto={emEdicao}
        categorias={categorias}
      />

      <DialogMovimentacao
        produto={movimentando?.produto ?? null}
        tipoInicial={movimentando?.tipo ?? "saida"}
        aoFechar={() => setMovimentando(null)}
      />
    </AppShell>
  );
}

function Filtro({
  ativo,
  onClick,
  className,
  children,
}: {
  ativo: boolean;
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={ativo}
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1.5 text-rotulo font-medium transition-colors",
        ativo
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-muted-foreground hover:bg-accent",
        className,
      )}
    >
      {children}
    </button>
  );
}
