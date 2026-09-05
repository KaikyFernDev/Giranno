-- =====================================================================
-- Controle de estoque para pequenos varejistas
-- =====================================================================

-- ---------- PRODUTOS ----------
CREATE TABLE public.produtos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL DEFAULT auth.uid(),
  nome            TEXT NOT NULL CHECK (length(btrim(nome)) > 0),
  categoria       TEXT NOT NULL DEFAULT 'Geral' CHECK (length(btrim(categoria)) > 0),
  sku             TEXT,
  preco_custo     NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (preco_custo >= 0),
  preco_venda     NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (preco_venda >= 0),
  estoque_atual   INTEGER NOT NULL DEFAULT 0 CHECK (estoque_atual >= 0),
  estoque_minimo  INTEGER NOT NULL DEFAULT 0 CHECK (estoque_minimo >= 0),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_produtos_user_id    ON public.produtos (user_id);
CREATE INDEX idx_produtos_categoria  ON public.produtos (user_id, categoria);
CREATE UNIQUE INDEX idx_produtos_sku_unico
  ON public.produtos (user_id, sku)
  WHERE sku IS NOT NULL AND btrim(sku) <> '';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.produtos TO authenticated;
GRANT ALL ON public.produtos TO service_role;

ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios gerenciam seus proprios produtos"
  ON public.produtos FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ---------- MOVIMENTACOES ----------
CREATE TABLE public.movimentacoes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL DEFAULT auth.uid(),
  produto_id  UUID NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  tipo        TEXT NOT NULL CHECK (tipo IN ('entrada', 'saida')),
  quantidade  INTEGER NOT NULL CHECK (quantidade > 0),
  data        TIMESTAMPTZ NOT NULL DEFAULT now(),
  observacao  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_mov_user_id   ON public.movimentacoes (user_id);
CREATE INDEX idx_mov_produto   ON public.movimentacoes (produto_id, data DESC);
CREATE INDEX idx_mov_data      ON public.movimentacoes (user_id, data DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.movimentacoes TO authenticated;
GRANT ALL ON public.movimentacoes TO service_role;

ALTER TABLE public.movimentacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios gerenciam suas proprias movimentacoes"
  ON public.movimentacoes FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ---------- updated_at ----------
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_produtos_updated_at
  BEFORE UPDATE ON public.produtos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- Aplicacao automatica da movimentacao no estoque ----------
-- Mantem produtos.estoque_atual coerente com o historico de movimentacoes,
-- de forma atomica, cobrindo INSERT / UPDATE / DELETE.
CREATE OR REPLACE FUNCTION public.aplicar_movimentacao_estoque()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  delta        INTEGER := 0;
  novo_estoque INTEGER;
  alvo         UUID;
BEGIN
  -- Desfaz o efeito da linha antiga (UPDATE / DELETE)
  IF (TG_OP = 'UPDATE' OR TG_OP = 'DELETE') THEN
    alvo := OLD.produto_id;
    delta := delta - (CASE WHEN OLD.tipo = 'entrada' THEN OLD.quantidade ELSE -OLD.quantidade END);
  END IF;

  -- Aplica o efeito da linha nova (INSERT / UPDATE)
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    -- Se o produto mudou no UPDATE, reverte no antigo antes de aplicar no novo
    IF (TG_OP = 'UPDATE' AND OLD.produto_id <> NEW.produto_id) THEN
      UPDATE public.produtos
         SET estoque_atual = estoque_atual + delta
       WHERE id = OLD.produto_id
       RETURNING estoque_atual INTO novo_estoque;

      IF novo_estoque < 0 THEN
        RAISE EXCEPTION 'Estoque insuficiente para o produto de origem.';
      END IF;

      delta := 0;
    END IF;

    alvo := NEW.produto_id;
    delta := delta + (CASE WHEN NEW.tipo = 'entrada' THEN NEW.quantidade ELSE -NEW.quantidade END);
  END IF;

  UPDATE public.produtos
     SET estoque_atual = estoque_atual + delta
   WHERE id = alvo
   RETURNING estoque_atual INTO novo_estoque;

  IF novo_estoque IS NULL THEN
    RAISE EXCEPTION 'Produto nao encontrado.';
  END IF;

  IF novo_estoque < 0 THEN
    RAISE EXCEPTION 'Estoque insuficiente: a saida excede o estoque disponivel.';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_movimentacoes_estoque
  AFTER INSERT OR UPDATE OR DELETE ON public.movimentacoes
  FOR EACH ROW EXECUTE FUNCTION public.aplicar_movimentacao_estoque();

-- ---------- Metricas: giro medio diario e dias restantes ----------
-- security_invoker = on garante que a RLS de produtos/movimentacoes se aplica
-- normalmente a quem consulta a view.
CREATE VIEW public.produtos_metricas
WITH (security_invoker = on)
AS
SELECT
  p.id,
  p.user_id,
  p.nome,
  p.categoria,
  p.sku,
  p.preco_custo,
  p.preco_venda,
  p.estoque_atual,
  p.estoque_minimo,
  p.created_at,
  p.updated_at,
  COALESCE(s.total_saidas_30d, 0)::INTEGER AS total_saidas_30d,
  ROUND(COALESCE(s.total_saidas_30d, 0)::NUMERIC / 30.0, 4) AS giro_medio_diario,
  CASE
    WHEN COALESCE(s.total_saidas_30d, 0) = 0 THEN NULL
    ELSE ROUND(p.estoque_atual / (COALESCE(s.total_saidas_30d, 0)::NUMERIC / 30.0), 1)
  END AS dias_restantes,
  s.ultima_saida
FROM public.produtos p
LEFT JOIN (
  SELECT
    m.produto_id,
    SUM(m.quantidade) AS total_saidas_30d,
    MAX(m.data)       AS ultima_saida
  FROM public.movimentacoes m
  WHERE m.tipo = 'saida'
    AND m.data >= now() - INTERVAL '30 days'
  GROUP BY m.produto_id
) s ON s.produto_id = p.id;

GRANT SELECT ON public.produtos_metricas TO authenticated;
GRANT ALL ON public.produtos_metricas TO service_role;