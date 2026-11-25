const API_URL = (import.meta.env.VITE_API_URL ?? '').trim().replace(/\/+$/, '');
const BASE_URL = API_URL ? `${API_URL}/api/v1` : '/api/v1';
const TOKEN_KEY = 'oy_token';

async function postMultipart(path, form, token) {
  const jwt = localStorage.getItem(TOKEN_KEY) || token;

  let response;
  try {
    response = await fetch(BASE_URL + path, {
      method: 'POST',
      // Sin Content-Type: el navegador agrega multipart/form-data con su boundary
      headers: jwt ? { Authorization: `Bearer ${jwt}` } : {},
      body: form,
    });
  } catch {
    throw new Error('No se pudo conectar con el servidor');
  }

  if (!response.ok) {
    const apiError = await response.json().catch(() => ({}));
    const error = new Error(
      apiError.message ?? apiError.mensaje ?? apiError.detail ?? apiError.error ?? `Error ${response.status}`,
    );
    error.status = response.status;
    throw error;
  }

  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

export const createRequestService = {
  create: async (payload, photos, token) => {
    const form = new FormData();
    form.append('data', new Blob([JSON.stringify(payload)], { type: 'application/json' }));
    photos.forEach((photo) => form.append('images', photo.file));

    const result = await postMultipart('/requests', form, token);
    const sent = Array.isArray(result) ? result.length : (result?.workersId?.length ?? 0);
    if (sent < 1) {
      throw new Error('La solicitud no se envió a ningún trabajador. Prueba con otros trabajadores.');
    }
    return { ...result, sent };
  },
};

export function describeSendError(error) {
  switch (error.status) {
    case 401:
    case 403:
      return 'Tu sesión no es válida o expiró. Vuelve a iniciar sesión.';
    case 413:
      return 'Las fotos pesan demasiado para enviarlas. Quita alguna e inténtalo de nuevo.';
    case 502:
    case 503:
    case 504:
      return 'No pudimos conectar con el servidor. Inténtalo de nuevo en un momento.';
    default:
      return error.message || 'No pudimos enviar la solicitud. Inténtalo de nuevo.';
  }
}
