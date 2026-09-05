/**
 * Acesso a dados via TanStack Query.
 *
 * Toda leitura e escrita passa pelo cliente do banco com RLS ativa, então o
 * isolamento por usuário é garantido no servidor — o `user_id` é preenchido
 * automaticamente pelo padrão da coluna, nunca enviado pelo navegador.
 */

import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import type {
  MovimentacaoRow,
  ProdutoComMetricas,
  TipoMovimentacao,
} from "@/lib/estoque";

export const chaves = {
  produtos: ["produtos"] as const,
  movimentacoes: ["movimentacoes"] as const,
};

/** Produtos já acompanhados de giro médio e dias restantes (view do banco). */
export const produtosQuery = queryOptions({
  queryKey: chaves.produtos,
  queryFn: async (): Promise<ProdutoComMetricas[]> => {
    const { data, error } = await supabase
      .from("produtos_metricas")
      .select("*")
      .order("nome", { ascending: true });

    if (error) throw new Error(error.message);
    return (data ?? []) as ProdutoComMetricas[];
  },
});

export interface MovimentacaoComProduto extends MovimentacaoRow {
  produtos: { nome: string; categoria: string } | null;
}

export const movimentacoesQuery = queryOptions({
  queryKey: chaves.movimentacoes,
  queryFn: async (): Promise<MovimentacaoComProduto[]> => {
    const { data, error } = await supabase
      .from("movimentacoes")
      .select("*, produtos(nome, categoria)")
      .order("data", { ascending: false })
      .limit(300);

    if (error) throw new Error(error.message);
    return (data ?? []) as MovimentacaoComProduto[];
  },
});

/** Campos que o formulário de produto envia. */
export interface DadosProduto {
  nome: string;
  categoria: string;
  sku: string | null;
  preco_custo: number;
  preco_venda: number;
  estoque_atual: number;
  estoque_minimo: number;
}

function useInvalidarTudo() {
  const qc = useQueryClient();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: chaves.produtos }),
      qc.invalidateQueries({ queryKey: chaves.movimentacoes }),
    ]);
}

export function useSalvarProduto() {
  const invalidar = useInvalidarTudo();

  return useMutation({
    mutationFn: async ({ id, dados }: { id?: string; dados: DadosProduto }) => {
      if (id) {
        // Em edição o estoque atual não é tocado aqui: ele só muda por
        // movimentação, para que o histórico permaneça a fonte da verdade.
        const { estoque_atual: _ignorado, ...campos } = dados;
        const { error } = await supabase.from("produtos").update(campos).eq("id", id);
        if (error) throw new Error(error.message);
        return;
      }

      const { error } = await supabase.from("produtos").insert(dados);
      if (error) throw new Error(error.message);
    },
    onSuccess: async (_r, variaveis) => {
      await invalidar();
      toast.success(variaveis.id ? "Produto atualizado" : "Produto cadastrado");
    },
    onError: (erro: Error) => toast.error(traduzirErro(erro.message)),
  });
}

export function useApagarProduto() {
  const invalidar = useInvalidarTudo();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("produtos").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: async () => {
      await invalidar();
      toast.success("Produto removido");
    },
    onError: (erro: Error) => toast.error(traduzirErro(erro.message)),
  });
}

export interface DadosMovimentacao {
  produto_id: string;
  tipo: TipoMovimentacao;
  quantidade: number;
  observacao: string | null;
}

export function useRegistrarMovimentacao() {
  const invalidar = useInvalidarTudo();

  return useMutation({
    mutationFn: async (dados: DadosMovimentacao) => {
      const { error } = await supabase.from("movimentacoes").insert(dados);
      if (error) throw new Error(error.message);
    },
    onSuccess: async (_r, variaveis) => {
      await invalidar();
      toast.success(
        variaveis.tipo === "entrada"
          ? `Entrada de ${variaveis.quantidade} registrada`
          : `Saída de ${variaveis.quantidade} registrada`,
      );
    },
    onError: (erro: Error) => toast.error(traduzirErro(erro.message)),
  });
}

/** Converte mensagens técnicas do banco em algo compreensível. */
export function traduzirErro(mensagem: string): string {
  if (mensagem.includes("Estoque insuficiente")) {
    return "Estoque insuficiente: a saída é maior do que o disponível.";
  }
  if (mensagem.includes("idx_produtos_sku_unico") || mensagem.includes("duplicate key")) {
    return "Já existe um produto com esse código/SKU.";
  }
  if (mensagem.includes("produtos_nome_check")) {
    return "O nome do produto não pode ficar em branco.";
  }
  if (mensagem.includes("quantidade")) {
    return "A quantidade precisa ser maior que zero.";
  }
  return mensagem;
}
