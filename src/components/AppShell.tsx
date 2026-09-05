import { Link, useNavigate } from "@tanstack/react-router";
import { Boxes, LayoutDashboard, LogOut, Package, ScrollText, ShoppingCart } from "lucide-react";
import { useEffect, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const NAVEGACAO = [
  { para: "/", rotulo: "Painel", Icone: LayoutDashboard },
  { para: "/produtos", rotulo: "Produtos", Icone: Package },
  { para: "/reposicao", rotulo: "Reposição", Icone: ShoppingCart },
  { para: "/movimentacoes", rotulo: "Movimentações", Icone: ScrollText },
] as const;

export interface AppShellProps {
  titulo: string;
  descricao?: string;
  /** Botões de ação exibidos à direita do título. */
  acoes?: ReactNode;
  children: ReactNode;
}

/**
 * Moldura das páginas internas.
 *
 * Também faz o desvio para o login quando não há sessão. Isso é conforto de
 * navegação, não segurança: o isolamento real dos dados vem das políticas de
 * acesso do banco, que valem mesmo se alguém burlar a interface.
 */
export function AppShell({ titulo, descricao, acoes, children }: AppShellProps) {
  const { usuario, carregando } = useAuth();
  const navegar = useNavigate();

  useEffect(() => {
    if (!carregando && !usuario) {
      void navegar({ to: "/entrar", replace: true });
    }
  }, [carregando, usuario, navegar]);

  if (carregando || !usuario) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-2 w-40 animate-pulse rounded-full bg-muted" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="nao-imprimir sticky top-0 z-30 border-b border-border bg-card/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
          <Link to="/" className="flex items-center gap-2 font-bold text-titulo">
            <Boxes className="size-5 text-primary" aria-hidden="true" />
            Giranno
          </Link>

          <nav className="ml-4 hidden items-center gap-1 md:flex" aria-label="Principal">
            {NAVEGACAO.map(({ para, rotulo, Icone }) => (
              <Link
                key={para}
                to={para}
                activeOptions={{ exact: para === "/" }}
                className="rounded-md px-3 py-1.5 text-corpo font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                activeProps={{ className: "bg-accent text-accent-foreground" }}
              >
                <span className="flex items-center gap-1.5">
                  <Icone className="size-4" aria-hidden="true" />
                  {rotulo}
                </span>
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <span className="hidden max-w-[180px] truncate text-rotulo text-muted-foreground sm:inline">
              {usuario.email}
            </span>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Sair da conta"
              onClick={() => void supabase.auth.signOut()}
            >
              <LogOut className="size-4" aria-hidden="true" />
            </Button>
          </div>
        </div>

        {/* Navegação em telas pequenas */}
        <nav
          className="flex items-center gap-1 overflow-x-auto border-t border-border px-4 py-2 md:hidden"
          aria-label="Principal (telas pequenas)"
        >
          {NAVEGACAO.map(({ para, rotulo, Icone }) => (
            <Link
              key={para}
              to={para}
              activeOptions={{ exact: para === "/" }}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-rotulo font-medium",
                "text-muted-foreground transition-colors hover:bg-accent",
              )}
              activeProps={{ className: "bg-accent text-accent-foreground" }}
            >
              <Icone className="size-4" aria-hidden="true" />
              {rotulo}
            </Link>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-numero font-bold">{titulo}</h1>
            {descricao ? (
              <p className="mt-1 text-corpo text-muted-foreground">{descricao}</p>
            ) : null}
          </div>
          {acoes ? <div className="nao-imprimir flex flex-wrap gap-2">{acoes}</div> : null}
        </div>

        {children}
      </main>
    </div>
  );
}
