import { useFotoPerfil } from '../hooks/useFotoPerfil';
import Avatar from './Avatar';

const SIN_NOMBRE = 'Cliente';

/** Foto y nombre de una persona de la reseña (genérico si no se conoce la cuenta), con la fecha debajo. */
function AutorResena({ autorId, nombre, sinNombre = SIN_NOMBRE, children }) {
  const foto = useFotoPerfil(autorId);
  const visible = nombre || sinNombre;
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
