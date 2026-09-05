-- Funcoes de gatilho nao devem ser invocaveis diretamente pela API.
-- O Postgres NAO exige privilegio EXECUTE para disparar uma funcao de gatilho,
-- portanto revogar aqui nao afeta o funcionamento dos triggers.

REVOKE ALL ON FUNCTION public.aplicar_movimentacao_estoque() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column()   FROM PUBLIC, anon, authenticated;