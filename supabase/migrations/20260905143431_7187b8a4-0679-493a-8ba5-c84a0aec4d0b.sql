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
    IF (TG_OP = 'UPDATE' AND OLD.produto_id <> NEW.produto_id) THEN
      UPDATE public.produtos
         SET estoque_atual = estoque_atual + delta
       WHERE id = OLD.produto_id
       RETURNING estoque_atual INTO novo_estoque;

      IF novo_estoque IS NOT NULL AND novo_estoque < 0 THEN
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

  -- Produto inexistente:
  -- Em DELETE isso e esperado quando o proprio produto foi apagado e o
  -- ON DELETE CASCADE removeu suas movimentacoes. Nada a ajustar.
  IF novo_estoque IS NULL THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
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

REVOKE ALL ON FUNCTION public.aplicar_movimentacao_estoque() FROM PUBLIC, anon, authenticated;