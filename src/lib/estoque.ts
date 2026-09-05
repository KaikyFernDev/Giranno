/**
 * Tipos e regras de negócio puras do controle de estoque.
 *
 * Tudo aqui é livre de React e de rede, para que as regras (giro médio, dias
 * restantes, classificação de urgência) possam ser lidas e testadas em um só
 * lugar. O banco calcula giro e dias na view `produtos_metricas`; as funções
 * abaixo espelham essa regra para o cliente e cobrem os casos de borda.
 */

import type { Database } from "@/integrations/supabase/types";

export type ProdutoRow = Database["public"]["Tables"]["produtos"]["Row"];
export type ProdutoInsert = Database["public"]["Tables"]["produtos"]["Insert"];
export type MovimentacaoRow = Database["public"]["Tables"]["movimentacoes"]["Row"];
export type TipoMovimentacao = "entrada" | "saida";

/** Linha da view `produtos_metricas`: produto + métricas derivadas. */
export interface ProdutoComMetricas {
  id: string;
  user_id: string;
  nome: string;
  categoria: string;
  sku: string | null;
  preco_custo: number;
  preco_venda: number;
  estoque_atual: number;
  estoque_minimo: number;
  created_at: string;
  updated_at: string;
  /** Soma das saídas nos últimos 30 dias. */
  total_saidas_30d: number;
  /** Saídas dos últimos 30 dias ÷ 30. Zero quando não houve saída. */
  giro_medio_diario: number;
  /** estoque_atual ÷ giro. `null` quando o giro é zero (sem previsão). */
  dias_restantes: number | null;
  ultima_saida: string | null;
}

/** Janela usada no cálculo do giro médio diário. */
export const JANELA_GIRO_DIAS = 30;

/** Abaixo deste número de dias de estoque, o produto é crítico. */
export const LIMITE_DIAS_CRITICO = 7;

/** Sem saídas por este período, o produto é considerado parado. */
export const DIAS_PARA_PARADO = 30;

export type StatusEstoque = "critico" | "atencao" | "parado" | "saudavel";

/**
 * Classifica um produto.
 *
 * Ordem de precedência, deliberada:
 * 1. `critico`  — vai acabar em menos de 7 dias no ritmo atual, OU já está
 *                 no/abaixo do estoque mínimo. Estoque zerado é sempre crítico.
 * 2. `parado`   — nenhuma saída nos últimos 30 dias e ainda há estoque.
 *                 Sem giro não há previsão de ruptura, então não é alerta.
 * 3. `atencao`  — entre 7 e 14 dias de cobertura.
 * 4. `saudavel` — o resto.
 */
export function classificarEstoque(p: ProdutoComMetricas): StatusEstoque {
  const dias = p.dias_restantes;

  if (p.estoque_atual <= 0) return "critico";
  if (p.estoque_minimo > 0 && p.estoque_atual <= p.estoque_minimo) return "critico";
  if (dias !== null && dias < LIMITE_DIAS_CRITICO) return "critico";
  if (p.giro_medio_diario <= 0) return "parado";
  if (dias !== null && dias < LIMITE_DIAS_CRITICO * 2) return "atencao";
  return "saudavel";
}

/** Ordena por urgência: menos dias restantes primeiro; sem giro por último. */
export function compararUrgencia(a: ProdutoComMetricas, b: ProdutoComMetricas): number {
  const da = a.dias_restantes ?? Number.POSITIVE_INFINITY;
  const db = b.dias_restantes ?? Number.POSITIVE_INFINITY;
  if (da !== db) return da - db;
  return a.nome.localeCompare(b.nome, "pt-BR");
}

/** Produtos que precisam de reposição, já ordenados por urgência. */
export function listaDeReposicao(produtos: ProdutoComMetricas[]): ProdutoComMetricas[] {
  return produtos.filter((p) => classificarEstoque(p) === "critico").sort(compararUrgencia);
}

/**
 * Quantidade sugerida de compra: o suficiente para cobrir 30 dias de giro,
 * descontando o que já existe. Mínimo de 1 unidade. Sem giro, sugere repor
 * até o estoque mínimo cadastrado.
 */
export function sugestaoDeCompra(p: ProdutoComMetricas): number {
  if (p.giro_medio_diario <= 0) {
    return Math.max(p.estoque_minimo - p.estoque_atual, 0);
  }
  const alvo = Math.ceil(p.giro_medio_diario * JANELA_GIRO_DIAS);
  return Math.max(alvo - p.estoque_atual, 1);
}

/** "3,2 dias" / "sem giro" / "esgotado" */
export function formatarDias(p: ProdutoComMetricas): string {
  if (p.estoque_atual <= 0) return "esgotado";
  if (p.dias_restantes === null) return "sem giro";
  return `${formatarNumero(p.dias_restantes, 1)} ${p.dias_restantes === 1 ? "dia" : "dias"}`;
}

export function formatarNumero(valor: number, casas = 0): string {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  }).format(valor);
}

export function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);
}

export function formatarData(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(
    new Date(iso),
  );
}

/** Margem de lucro unitária em percentual. `null` quando não há custo. */
export function margem(p: Pick<ProdutoComMetricas, "preco_custo" | "preco_venda">): number | null {
  if (p.preco_custo <= 0) return null;
  return ((p.preco_venda - p.preco_custo) / p.preco_custo) * 100;
}

/** Texto simples da lista de reposição, para baixar como arquivo .txt. */
export function gerarTextoReposicao(produtos: ProdutoComMetricas[]): string {
  const agora = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date());

  const linhas: string[] = [
    "LISTA DE REPOSIÇÃO",
    `Gerada em ${agora}`,
    "".padEnd(60, "="),
    "",
  ];

  if (produtos.length === 0) {
    linhas.push("Nenhum produto precisa de reposição no momento.");
    return linhas.join("\n");
  }

  produtos.forEach((p, i) => {
    linhas.push(
      `${String(i + 1).padStart(2, "0")}. ${p.nome}${p.sku ? ` (${p.sku})` : ""}`,
      `    Categoria........: ${p.categoria}`,
      `    Estoque atual....: ${formatarNumero(p.estoque_atual)}`,
      `    Giro médio/dia...: ${formatarNumero(p.giro_medio_diario, 2)}`,
      `    Dias restantes...: ${formatarDias(p)}`,
      `    Comprar..........: ${formatarNumero(sugestaoDeCompra(p))} un.`,
      "",
    );
  });

  linhas.push("".padEnd(60, "="), `Total de itens: ${produtos.length}`);
  return linhas.join("\n");
}

/** Dispara o download de um texto como arquivo. Só roda no navegador. */
export function baixarTexto(nomeArquivo: string, conteudo: string): void {
  const blob = new Blob([conteudo], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
