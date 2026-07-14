import { useEffect, useRef } from 'react';
import type { Dispatch } from 'react';
import type { AppAction } from '@/store/reducer';
import type { SseEvent } from '@/types';
import { apiUrl } from '@/config';

export function useSSE(dispatch: Dispatch<AppAction>) {
  const retryRef = useRef(0);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    let cancelled = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;

    const connect = () => {
      if (cancelled) return;
      dispatch({ type: 'SSE_STATUS', status: 'reconnecting' });
      const es = new EventSource(apiUrl('/events'));
      esRef.current = es;

      es.onopen = () => {
        retryRef.current = 0;
        dispatch({ type: 'SSE_STATUS', status: 'connected' });
      };

      const handle = (raw: MessageEvent) => {
        try {
          const event = JSON.parse(raw.data as string) as SseEvent;
          switch (event.type) {
            case 'obligation_created':
              dispatch({
                type: 'OBLIGATION_CREATED',
                obligation: event.obligation,
              });
              break;
            case 'obligation_updated':
              dispatch({
                type: 'OBLIGATION_UPDATED',
                obligation: event.obligation,
              });
              break;
            case 'obligation_deleted':
              dispatch({ type: 'OBLIGATION_DELETE_START', id: event.id });
              setTimeout(() => {
                dispatch({ type: 'OBLIGATION_DELETED', id: event.id });
              }, 280);
              break;
            case 'payment_recorded':
              dispatch({
                type: 'PAYMENT_RECORDED',
                payment: event.payment,
              });
              break;
          }
        } catch {
          /* ignore malformed */
        }
      };

      es.addEventListener('obligation_created', handle);
      es.addEventListener('obligation_updated', handle);
      es.addEventListener('obligation_deleted', handle);
      es.addEventListener('payment_recorded', handle);

      es.onerror = () => {
        es.close();
        esRef.current = null;
        dispatch({ type: 'SSE_STATUS', status: 'reconnecting' });
        const delay = Math.min(1000 * 2 ** retryRef.current, 15_000);
        retryRef.current += 1;
        reconnectTimer = setTimeout(connect, delay);
      };
    };

    connect();

    return () => {
      cancelled = true;
      clearTimeout(reconnectTimer);
      esRef.current?.close();
    };
  }, [dispatch]);
}
