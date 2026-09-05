import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Boxes } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/entrar")({
  head: () => ({
    meta: [
      { title: "Entrar — Controle de Estoque para varejo" },
      {
        name: "description",
        content:
          "Acesse seu controle de estoque: cadastro de produtos, entradas e saídas rápidas e alertas de reposição.",
      },
      { property: "og:title", content: "Entrar — Controle de Estoque" },
      {
        property: "og:description",
        content: "Acesse seu controle de estoque de mercadinho, loja ou papelaria.",
      },
    ],
  }),
  component: PaginaEntrar,
});

function PaginaEntrar() {
  const { usuario, carregando } = useAuth();
  const navegar = useNavigate();
  const [modo, setModo] = useState<"entrar" | "criar">("entrar");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!carregando && usuario) void navegar({ to: "/", replace: true });
  }, [carregando, usuario, navegar]);

  const enviar = async (evento: FormEvent) => {
    evento.preventDefault();
    setErro(null);

    if (senha.length < 6) {
      setErro("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }

    setEnviando(true);
    try {
      if (modo === "criar") {
        const { error } = await supabase.auth.signUp({
          email,
          password: senha,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Conta criada. Você já pode usar o sistema.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
        if (error) throw error;
      }
    } catch (e) {
      const mensagem = e instanceof Error ? e.message : "Não foi possível continuar.";
      setErro(
        mensagem.includes("Invalid login credentials")
          ? "E-mail ou senha incorretos."
          : mensagem.includes("already registered")
            ? "Este e-mail já tem conta. Tente entrar."
            : mensagem,
      );
    } finally {
      setEnviando(false);
    }
  };

  const entrarComGoogle = async () => {
    setErro(null);
    const { lovable } = await import("@/integrations/lovable/index");
    const resultado = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (resultado.error) {
      setErro("Não foi possível entrar com o Google. Tente novamente.");
      return;
    }
    if (resultado.redirected) return;
    void navegar({ to: "/", replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="entrada-card sombra-card w-full max-w-sm rounded-2xl border border-border bg-card p-7">
        <div className="flex items-center gap-2">
          <Boxes className="size-6 text-primary" aria-hidden="true" />
          <span className="text-titulo font-bold">Controle de Estoque</span>
        </div>

        <h1 className="mt-5 text-titulo font-bold">
          {modo === "entrar" ? "Entrar na sua conta" : "Criar sua conta"}
        </h1>
        <p className="mt-1 text-corpo text-muted-foreground">
          Seus produtos e movimentações ficam visíveis só para você.
        </p>

        <form onSubmit={enviar} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="senha">Senha</Label>
            <Input
              id="senha"
              type="password"
              autoComplete={modo === "criar" ? "new-password" : "current-password"}
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
            />
          </div>

          {erro ? (
            <p role="alert" className="text-rotulo font-medium text-critico">
              {erro}
            </p>
          ) : null}

          <Button type="submit" className="w-full" disabled={enviando}>
            {enviando ? "Aguarde…" : modo === "entrar" ? "Entrar" : "Criar conta"}
          </Button>
        </form>

        <div className="my-4 flex items-center gap-3 text-rotulo text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          ou
          <span className="h-px flex-1 bg-border" />
        </div>

        <Button variant="outline" className="w-full" onClick={() => void entrarComGoogle()}>
          Continuar com Google
        </Button>

        <button
          type="button"
          onClick={() => {
            setModo(modo === "entrar" ? "criar" : "entrar");
            setErro(null);
          }}
          className={cn(
            "mt-5 w-full text-rotulo text-muted-foreground underline-offset-4",
            "transition-colors hover:text-foreground hover:underline",
          )}
        >
          {modo === "entrar" ? "Não tem conta? Criar agora" : "Já tem conta? Entrar"}
        </button>
      </div>
    </div>
  );
}
