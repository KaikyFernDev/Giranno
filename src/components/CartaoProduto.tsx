import { ArrowDownToLine, ArrowUpFromLine, Pencil, Trash2 } from "lucide-react";

import { BadgeEstoque } from "@/components/BadgeEstoque";
import { NumeroAnimado } from "@/components/NumeroAnimado";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { ProdutoComMetricas, TipoMovimentacao } from "@/lib/estoque";
import { formatarDias, formatarMoeda, formatarNumero } from "@/lib/estoque";

export interface CartaoProdutoProps {
  produto: ProdutoComMetricas;
  /** Índice na grade, para a entrada escalonada. */
  ordem?: number;
  aoMovimentar: (produto: ProdutoComMetricas, tipo: TipoMovimentacao) => void;
  aoEditar: (produto: ProdutoComMetricas) => void;
  aoApagar: (id: string) => void;
}

/** Cartão de produto com o registro rápido de entrada e saída embutido. */
export function CartaoProduto({
  produto,
  ordem = 0,
  aoMovimentar,
  aoEditar,
  aoApagar,
}: CartaoProdutoProps) {
  return (
    <article
      className="entrada-card flutuar flex flex-col rounded-xl border border-border bg-card p-4"
      style={{ animationDelay: `${Math.min(ordem, 12) * 40}ms` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-titulo font-semibold">{produto.nome}</h3>
          <p className="mt-0.5 truncate text-rotulo text-muted-foreground">
            {produto.categoria}
            {produto.sku ? ` · ${produto.sku}` : ""}
          </p>
        </div>
        <BadgeEstoque produto={produto} />
      </div>

      <div className="mt-4 flex items-end justify-between gap-3">
        <p className="text-numero font-bold leading-none">
          <NumeroAnimado valor={produto.estoque_atual} sufixo="un." />
        </p>
        <div className="text-right text-rotulo text-muted-foreground">
          <p>{formatarNumero(produto.giro_medio_diario, 2)}/dia</p>
          <p>dura {formatarDias(produto)}</p>
        </div>
      </div>

      <p className="mt-3 text-rotulo text-muted-foreground">
        Custo {formatarMoeda(produto.preco_custo)} · Venda {formatarMoeda(produto.preco_venda)}
        {produto.estoque_minimo > 0 ? ` · mín. ${produto.estoque_minimo}` : ""}
      </p>

      <div className="mt-4 flex items-center gap-2 border-t border-border pt-3">
        <Button
          size="sm"
          className="flex-1"
          onClick={() => aoMovimentar(produto, "saida")}
          disabled={produto.estoque_atual <= 0}
        >
          <ArrowUpFromLine className="size-4" aria-hidden="true" />
          Saída
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="flex-1"
          onClick={() => aoMovimentar(produto, "entrada")}
        >
          <ArrowDownToLine className="size-4" aria-hidden="true" />
          Entrada
        </Button>

        <Button
          size="icon"
          variant="ghost"
          aria-label={`Editar ${produto.nome}`}
          onClick={() => aoEditar(produto)}
        >
          <Pencil className="size-4" aria-hidden="true" />
        </Button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="icon" variant="ghost" aria-label={`Remover ${produto.nome}`}>
              <Trash2 className="size-4" aria-hidden="true" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remover {produto.nome}?</AlertDialogTitle>
              <AlertDialogDescription>
                Todo o histórico de entradas e saídas deste produto também será apagado. Não dá
                para desfazer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={() => aoApagar(produto.id)}>Remover</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </article>
  );
}
