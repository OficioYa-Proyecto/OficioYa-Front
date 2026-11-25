import { useCallback, useRef, useState } from 'react';
import { buildCreateRequestPayload } from '../requestPayload';
import { resolveUserIds } from './useWorkerPhoto';
import { createRequestService, describeSendError } from '../services/createRequestService';

const IDLE = { sending: false, error: '', result: null };

export function useCreateRequest(token) {
  const [state, setState] = useState(IDLE);
  const inFlight = useRef(false);

  const send = useCallback(
    async (values) => {
      if (inFlight.current) {
        return false;
      }
      inFlight.current = true;
      setState({ sending: true, error: '', result: null });
      try {
        const workersId = await resolveUserIds(values.workers);
        const created = await createRequestService.create(
          buildCreateRequestPayload(values, workersId),
          values.photos,
          token,
        );
        setState({ sending: false, error: '', result: created });
        return true;
      } catch (error) {
        setState({ sending: false, error: describeSendError(error), result: null });
        return false;
      } finally {
        inFlight.current = false;
      }
    },
    [token],
  );

  const reset = useCallback(() => setState(IDLE), []);

  return { ...state, send, reset };
}