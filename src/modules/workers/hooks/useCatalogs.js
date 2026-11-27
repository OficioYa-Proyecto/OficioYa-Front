import { listLocalities, listTrades, listZones } from '../services/workersService';
import { useRequest } from './useRequest';

// Oficios activos del catálogo (TradeResponse[]).
export function useTrades() {
  return useRequest(listTrades);
}

// Zonas (barrios) [{ id, name, locality }] (dominio Users).
export function useZones() {
  return useRequest(listZones);
}

export function useLocalities() {
  return useRequest(listLocalities);
}
