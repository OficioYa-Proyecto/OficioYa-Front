import { useFotoPerfil } from '../hooks/useFotoPerfil';
import Avatar from './Avatar';

const SIN_NOMBRE = 'Cliente';

/** Foto y nombre de quien escribió la reseña ("Cliente" si no se conoce la cuenta), con la fecha debajo. */
function AutorResena({ autorId, nombre, children }) {
  const foto = useFotoPerfil(autorId);
  const visible = nombre || SIN_NOMBRE;
  return (
    <>
      <Avatar key={foto ?? 'sin-foto'} nombre={visible} foto={foto} tamano={38} />
      <div>
        <strong>{visible}</strong>
        {children}
      </div>
    </>
  );
}

export default AutorResena;
