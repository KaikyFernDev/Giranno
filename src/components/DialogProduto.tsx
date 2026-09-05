import { useEffect, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ProdutoComMetricas } from "@/lib/estoque";
import { useSalvarProduto, type DadosProduto } from "@/lib/queries";

const VAZIO: DadosProduto = {
  nome: "",
  categoria: "",
  sku: null,
  preco_custo: 0,
  preco_venda: 0,
  estoque_atual: 0,
  estoque_minimo: 0,
};

export interface DialogProdutoProps {
  aberto: boolean;
  aoFechar: () => void;
  /** Quando presente, o formulário edita em vez de cadastrar. */
  produto?: ProdutoComMetricas | null;
  /** Sugestões de categorias já usadas. */
  categorias: string[];
}

/** Formulário de cadastro e edição de produto. */
export function DialogProduto({ aberto, aoFechar, produto, categorias }: DialogProdutoProps) {
  const [dados, setDados] = useState<DadosProduto>(VAZIO);
  const [erro, setErro] = useState<string | null>(null);
  const salvar = useSalvarProduto();
  const editando = Boolean(produto);

  useEffect(() => {
    if (!aberto) return;
    setErro(null);
    setDados(
      produto
        ? {
            nome: produto.nome,
            categoria: produto.categoria,
            sku: produto.sku,
            preco_custo: produto.preco_custo,
            preco_venda: produto.preco_venda,
            estoque_atual: produto.estoque_atual,
            estoque_minimo: produto.estoque_minimo,
          }
        : VAZIO,
    );
  }, [aberto, produto]);

  const campo = <K extends keyof DadosProduto>(chave: K, valor: DadosProduto[K]) =>
    setDados((atual) => ({ ...atual, [chave]: valor }));

  const enviar = (evento: FormEvent) => {
    evento.preventDefault();

    if (!dados.nome.trim()) return setErro("Informe o nome do produto.");
    if (!dados.categoria.trim()) return setErro("Informe a categoria.");
    if (dados.preco_custo < 0 || dados.preco_venda < 0)
      return setErro("Os preços não podem ser negativos.");
    if (dados.estoque_atual < 0 || dados.estoque_minimo < 0)
      return setErro("As quantidades não podem ser negativas.");

    setErro(null);
    salvar.mutate(
      {
        ...(produto ? { id: produto.id } : {}),
        dados: {
          ...dados,
          nome: dados.nome.trim(),
          categoria: dados.categoria.trim(),
          sku: dados.sku?.trim() ? dados.sku.trim() : null,
        },
      },
      { onSuccess: aoFechar },
    );
  };

  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && aoFechar()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editando ? "Editar produto" : "Novo produto"}</DialogTitle>
          <DialogDescription>
            {editando
              ? "O estoque atual só muda por entrada ou saída, para preservar o histórico."
              : "Informe o estoque que existe hoje na prateleira."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={enviar} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="nome">Nome</Label>
            <Input
              id="nome"
              value={dados.nome}
              onChange={(e) => campo("nome", e.target.value)}
              placeholder="Arroz 5kg"
              autoFocus
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="categoria">Categoria</Label>
              <Input
                id="categoria"
                list="lista-categorias"
                value={dados.categoria}
                onChange={(e) => campo("categoria", e.target.value)}
                placeholder="Alimentos"
                required
              />
              <datalist id="lista-categorias">
                {categorias.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sku">Código / SKU (opcional)</Label>
              <Input
                id="sku"
                value={dados.sku ?? ""}
                onChange={(e) => campo("sku", e.target.value)}
                placeholder="7891234567890"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="custo">Preço de custo (R$)</Label>
              <Input
                id="custo"
                type="number"
                min={0}
                step="0.01"
                value={dados.preco_custo}
                onChange={(e) => campo("preco_custo", Number(e.target.value))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="venda">Preço de venda (R$)</Label>
              <Input
                id="venda"
                type="number"
                min={0}
                step="0.01"
                value={dados.preco_venda}
                onChange={(e) => campo("preco_venda", Number(e.target.value))}
              />
            </div>

            {!editando ? (
              <div className="space-y-1.5">
                <Label htmlFor="atual">Estoque atual</Label>
                <Input
                  id="atual"
                  type="number"
                  min={0}
                  value={dados.estoque_atual}
                  onChange={(e) => campo("estoque_atual", Number(e.target.value))}
                />
              </div>
            ) : null}

            <div className="space-y-1.5">
              <Label htmlFor="minimo">Estoque mínimo</Label>
              <Input
                id="minimo"
                type="number"
                min={0}
                value={dados.estoque_minimo}
                onChange={(e) => campo("estoque_minimo", Number(e.target.value))}
              />
            </div>
          </div>

          {erro ? (
            <p role="alert" className="text-rotulo font-medium text-critico">
              {erro}
            </p>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={aoFechar}>
              Cancelar
            </Button>
            <Button type="submit" disabled={salvar.isPending}>
              {salvar.isPending ? "Salvando…" : editando ? "Salvar" : "Cadastrar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
