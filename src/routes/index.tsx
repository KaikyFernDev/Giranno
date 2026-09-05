import { Link, createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Moon, Package, TrendingUp, Wallet } from "lucide-react";
import { useMemo } from "react";

import { AppShell } from "@/components/AppShell";
import { BadgeEstoque } from "@/components/BadgeEstoque";
import { CartaoMetrica } from "@/components/CartaoMetrica";
import { EsqueletoLista, EsqueletoMetricas } from "@/components/Esqueletos";
import { Button } from "@/components/ui/button";
import {
  classificarEstoque,
  formatarDias,
  formatarNumero,
  listaDeReposicao,
  type ProdutoComMetricas,
} from "@/lib/estoque";
import { produtosQuery } from "@/lib/queries";

const DESCRICAO =
  "O Giranno acompanha a saída dos seus produtos e avisa o que vai acabar antes de faltar na prateleira.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Giranno — Saiba o que repor antes de faltar" },
      { name: "description", content: DESCRICAO },
      { property: "og:title", content: "Giranno — Saiba o que repor antes de faltar" },
      { property: "og:description", content: DESCRICAO },
      { property: "og:url", content: "https://giranno.lovable.app/" },
      { property: "og:image", content: "https://giranno.lovable.app/og-banner.jpg" },
      { name: "twitter:title", content: "Giranno — Saiba o que repor antes de faltar" },
      { name: "twitter:description", content: DESCRICAO },
      { name: "twitter:image", content: "https://giranno.lovable.app/og-banner.jpg" },
    ],
    links: [{ rel: "canonical", href: "https://giranno.lovable.app/" }],
  }),
  component: PaginaPainel,
});

function PaginaPainel() {
  const { data: produtos, isPending, isError, error } = useQuery(produtosQuery);

  const resumo = useMemo(() => {
    const lista = produtos ?? [];
    return {
      total: lista.length,
      unidades: lista.reduce((s, p) => s + p.estoque_atual, 0),
      valorCusto: lista.reduce((s, p) => s + p.estoque_atual * p.preco_custo, 0),
      criticos: listaDeReposicao(lista),
      maisVendidos: [...lista]
        .filter((p) => p.total_saidas_30d > 0)
        .sort((a, b) => b.total_saidas_30d - a.total_saidas_30d)
        .slice(0, 5),
      parados: lista.filter((p) => classificarEstoque(p) === "parado").slice(0, 5),
    };
  }, [produtos]);

  return (
    <AppShell
      titulo="Painel"
      descricao="Resumo dos últimos 30 dias de movimentação."
      acoes={
        <Button asChild>
          <Link to="/produtos">Registrar entrada ou saída</Link>
        </Button>
      }
    >
      {isError ? (
        <p role="alert" className="rounded-xl border border-critico/25 bg-critico-suave p-4 text-corpo text-critico">
          Não foi possível carregar os dados: {(error as Error).message}
        </p>
      ) : isPending ? (
        <div className="space-y-8">
          <EsqueletoMetricas />
          <EsqueletoLista linhas={4} />
        </div>
      ) : (
        <div className="space-y-10">
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <CartaoMetrica
              rotulo="Produtos cadastrados"
              valor={resumo.total}
              ordem={0}
              Icone={Package}
            />
            <CartaoMetrica
              rotulo="Unidades em estoque"
              valor={resumo.unidades}
              ordem={1}
              Icone={TrendingUp}
            />
            <CartaoMetrica
              rotulo="Valor em estoque"
              valor={resumo.valorCusto}
              casas={2}
              prefixo="R$"
              ordem={2}
              Icone={Wallet}
              detalhe="pelo preço de custo"
            />
            <CartaoMetrica
              rotulo="Repor com urgência"
              valor={resumo.criticos.length}
              ordem={3}
              Icone={AlertTriangle}
              critico={resumo.criticos.length > 0}
              detalhe="menos de 7 dias de estoque"
            />
          </section>

          {resumo.total === 0 ? (
            <EstadoVazio />
          ) : (
            <>
              <SecaoReposicao produtos={resumo.criticos} />

              <div className="grid gap-6 lg:grid-cols-2">
                <Painel
                  titulo="Mais vendidos"
                  descricao="Maior saída nos últimos 30 dias"
                  vazio="Nenhuma saída registrada ainda."
                  produtos={resumo.maisVendidos}
                  render={(p) => `${formatarNumero(p.total_saidas_30d)} un. saíram`}
                />
                <Painel
                  titulo="Produtos parados"
                  descricao="Sem nenhuma saída em 30 dias"
                  vazio="Tudo girando — nenhum produto parado."
                  Icone={Moon}
                  produtos={resumo.parados}
                  render={(p) => `${formatarNumero(p.estoque_atual)} un. paradas`}
                />
              </div>
            </>
          )}
        </div>
      )}
    </AppShell>
  );
}

function EstadoVazio() {
  return (
    <div className="entrada-card sombra-card rounded-xl border border-border bg-card p-10 text-center">
      <h2 className="text-titulo font-semibold">Comece cadastrando seus produtos</h2>
      <p className="mx-auto mt-2 max-w-md text-corpo text-muted-foreground">
        Assim que houver produtos e algumas saídas registradas, o painel mostra o giro diário e
        avisa o que está prestes a acabar.
      </p>
      <Button asChild className="mt-5">
        <Link to="/produtos">Cadastrar primeiro produto</Link>
      </Button>
    </div>
  );
}

function SecaoReposicao({ produtos }: { produtos: ProdutoComMetricas[] }) {
  if (produtos.length === 0) {
    return (
      <section className="entrada-card sombra-card rounded-xl border border-border bg-card p-5">
        <h2 className="text-titulo font-semibold">Nada urgente por enquanto</h2>
        <p className="mt-1 text-corpo text-muted-foreground">
          Nenhum produto deve acabar nos próximos 7 dias no ritmo atual de vendas.
        </p>
      </section>
    );
  }

  return (
    <section className="entrada-card" style={{ animationDelay: "320ms" }}>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-titulo font-semibold">Reposição urgente</h2>
          <p className="text-corpo text-muted-foreground">Ordenado por quem acaba primeiro.</p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link to="/reposicao">Ver lista completa</Link>
        </Button>
      </div>

      <ul className="space-y-2">
        {produtos.slice(0, 5).map((p, i) => (
          <li
            key={p.id}
            className="entrada-card flutuar flex flex-wrap items-center gap-3 rounded-xl border border-critico/25 bg-card p-4"
            style={{ animationDelay: `${360 + i * 60}ms` }}
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-corpo font-semibold">{p.nome}</p>
              <p className="text-rotulo text-muted-foreground">
                {formatarNumero(p.estoque_atual)} un. · {formatarNumero(p.giro_medio_diario, 2)}/dia
              </p>
            </div>
            <span className="text-corpo font-bold text-critico tabular">{formatarDias(p)}</span>
            <BadgeEstoque produto={p} />
          </li>
        ))}
      </ul>
    </section>
  );
}

interface PainelProps {
  titulo: string;
  descricao: string;
  vazio: string;
  produtos: ProdutoComMetricas[];
  render: (p: ProdutoComMetricas) => string;
  Icone?: typeof Moon;
}

function Painel({ titulo, descricao, vazio, produtos, render }: PainelProps) {
  return (
    <section
      className="entrada-card sombra-card rounded-xl border border-border bg-card p-5"
      style={{ animationDelay: "400ms" }}
    >
      <h2 className="text-titulo font-semibold">{titulo}</h2>
      <p className="mt-0.5 text-rotulo text-muted-foreground">{descricao}</p>

      {produtos.length === 0 ? (
        <p className="mt-4 text-corpo text-muted-foreground">{vazio}</p>
      ) : (
        <ol className="mt-4 space-y-1">
          {produtos.map((p, i) => (
            <li
              key={p.id}
              className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-accent"
            >
              <span className="w-5 shrink-0 text-rotulo font-semibold text-muted-foreground tabular">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1 truncate text-corpo font-medium">{p.nome}</span>
              <span className="shrink-0 text-rotulo text-muted-foreground tabular">
                {render(p)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
