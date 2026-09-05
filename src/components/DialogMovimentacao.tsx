import { ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";

import { NumeroAnimado } from "@/components/NumeroAnimado";
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
import type { ProdutoComMetricas, TipoMovimentacao } from "@/lib/estoque";
import { useRegistrarMovimentacao } from "@/lib/queries";
import { cn } from "@/lib/utils";

const ATALHOS = [1, 5, 10, 20] as const;

export interface DialogMovimentacaoProps {
  produto: ProdutoComMetricas | null;
  /** Tipo pré-selecionado ao abrir — o registro rápido é de poucos cliques. */
  tipoInicial: TipoMovimentacao;
  aoFechar: () => void;
}

/**
 * Registro rápido de entrada ou saída.
 *
 * O caminho curto é: clicar em "Saída" no cartão do produto, tocar num atalho
 * de quantidade e confirmar — três cliques. O campo numérico continua
 * disponível para quantidades fora dos atalhos.
 */
export function DialogMovimentacao({ produto, tipoInicial, aoFechar }: DialogMovimentacaoProps) {
  const [tipo, setTipo] = useState<TipoMovimentacao>(tipoInicial);
  const [quantidade, setQuantidade] = useState(1);
  const [observacao, setObservacao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const registrar = useRegistrarMovimentacao();

  useEffect(() => {
    if (!produto) return;
    setTipo(tipoInicial);
    setQuantidade(1);
    setObservacao("");
    setErro(null);
  }, [produto, tipoInicial]);

  if (!produto) return null;

  const excedeEstoque = tipo === "saida" && quantidade > produto.estoque_atual;
  const previsto =
    tipo === "entrada" ? produto.estoque_atual + quantidade : produto.estoque_atual - quantidade;

  const enviar = (evento: FormEvent) => {
    evento.preventDefault();
    if (quantidade <= 0) return setErro("A quantidade precisa ser maior que zero.");
    if (excedeEstoque)
      return setErro(`Só há ${produto.estoque_atual} em estoque para dar saída.`);

    setErro(null);
    registrar.mutate(
      {
        produto_id: produto.id,
        tipo,
        quantidade,
        observacao: observacao.trim() || null,
      },
      { onSuccess: aoFechar },
    );
  };

  return (
    <Dialog open onOpenChange={(v) => !v && aoFechar()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{produto.nome}</DialogTitle>
          <DialogDescription>
            Em estoque agora: {produto.estoque_atual} un.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={enviar} className="space-y-4">
          <div className="grid grid-cols-2 gap-2" role="group" aria-label="Tipo de movimentação">
            {(
              [
                { valor: "entrada", rotulo: "Entrada", Icone: ArrowDownToLine },
                { valor: "saida", rotulo: "Saída", Icone: ArrowUpFromLine },
              ] as const
            ).map(({ valor, rotulo, Icone }) => (
              <button
                key={valor}
                type="button"
                aria-pressed={tipo === valor}
                onClick={() => setTipo(valor)}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-corpo font-semibold transition-colors",
                  tipo === valor
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:bg-accent",
                )}
              >
                <Icone className="size-4" aria-hidden="true" />
                {rotulo}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantidade">Quantidade</Label>
            <div className="flex flex-wrap gap-2">
              {ATALHOS.map((n) => (
                <Button
                  key={n}
                  type="button"
                  variant={quantidade === n ? "default" : "outline"}
                  size="sm"
                  onClick={() => setQuantidade(n)}
                >
                  {n}
                </Button>
              ))}
            </div>
            <Input
              id="quantidade"
              type="number"
              min={1}
              value={quantidade}
              onChange={(e) => setQuantidade(Math.max(Number(e.target.value) || 0, 0))}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="observacao">Observação (opcional)</Label>
            <Input
              id="observacao"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder={tipo === "entrada" ? "Compra do fornecedor" : "Venda no balcão"}
            />
          </div>

          <div className="rounded-lg border border-border bg-muted/50 px-3 py-2.5 text-corpo">
            <span className="text-muted-foreground">Estoque depois: </span>
            <span className={cn("font-bold", excedeEstoque ? "text-critico" : "text-foreground")}>
              <NumeroAnimado valor={Math.max(previsto, 0)} sufixo="un." />
            </span>
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
            <Button type="submit" disabled={registrar.isPending || excedeEstoque}>
              {registrar.isPending ? "Registrando…" : "Confirmar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
