import { useEffect, useState } from 'react';

/**
 * true desde que el elemento entra (o está por entrar) en pantalla, y ya no vuelve a false.
 * Sirve para pedir la foto de una tarjeta solo cuando hace falta mostrarla.
 */
export function useVisible(ref, margen = '200px') {
  // Navegadores sin IntersectionObserver: todo cuenta como visible, como antes.
  const [visible, setVisible] = useState(() => typeof IntersectionObserver === 'undefined');

  useEffect(() => {
    const elemento = ref.current;
    if (visible || !elemento) {
      return undefined;
    }
    const observador = new IntersectionObserver(
      (entradas) => {
        if (entradas.some((entrada) => entrada.isIntersecting)) {
          setVisible(true);
          observador.disconnect();
        }
      },
      { rootMargin: margen },
    );
    observador.observe(elemento);
    return () => observador.disconnect();
  }, [ref, margen, visible]);

  return visible;
}
