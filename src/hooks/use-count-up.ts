import { useEffect, useRef, useState } from "react";

/**
 * Anima a transição entre o valor anterior e o novo (contagem crescente ou
 * decrescente), em vez de trocar o número instantaneamente.
 *
 * Usa `requestAnimationFrame` com easing suave. Na primeira renderização o
 * valor aparece já animado a partir de zero, o que dá vida ao painel; em
 * atualizações posteriores anima a partir do valor que estava na tela.
 */
export function useCountUp(valor: number, duracaoMs = 650): number {
  const [exibido, setExibido] = useState(0);
  const anteriorRef = useRef(0);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const inicio = anteriorRef.current;
    const destino = valor;

    if (inicio === destino) {
      setExibido(destino);
      return;
    }

    // Respeita a preferência de menos movimento do sistema operacional.
    const semMovimento =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    if (semMovimento || duracaoMs <= 0) {
      anteriorRef.current = destino;
      setExibido(destino);
      return;
    }

    const t0 = performance.now();

    const passo = (agora: number) => {
      const p = Math.min((agora - t0) / duracaoMs, 1);
      // easeOutCubic: rápido no início, assenta suavemente no fim
      const eased = 1 - Math.pow(1 - p, 3);
      const atual = inicio + (destino - inicio) * eased;

      setExibido(atual);

      if (p < 1) {
        frameRef.current = requestAnimationFrame(passo);
      } else {
        anteriorRef.current = destino;
      }
    };

    frameRef.current = requestAnimationFrame(passo);

    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      // Guarda onde parou, para que uma nova mudança continue daqui.
      anteriorRef.current = destino;
    };
  }, [valor, duracaoMs]);

  return exibido;
}
