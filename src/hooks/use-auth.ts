import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";

/**
 * Sessão do usuário conectado.
 *
 * A ordem importa: registramos `onAuthStateChange` ANTES de chamar
 * `getSession()`, senão um evento disparado no meio do caminho seria perdido.
 * `carregando` distingue "ainda não sei" de "não há sessão", evitando que a
 * tela pisque um redirecionamento para o login antes da sessão hidratar.
 */
export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let ativo = true;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_evento, novaSessao) => {
      if (!ativo) return;
      setSession(novaSessao);
      setCarregando(false);
    });

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!ativo) return;
        setSession(data.session);
        setCarregando(false);
      })
      .catch(() => {
        if (!ativo) return;
        setCarregando(false);
      });

    return () => {
      ativo = false;
      subscription.unsubscribe();
    };
  }, []);

  return { session, usuario: session?.user ?? null, carregando };
}
