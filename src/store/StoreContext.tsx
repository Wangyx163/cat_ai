import { createContext, useContext, useEffect, useReducer, type Dispatch, type ReactNode } from 'react';
import { todayISO, type ISODate } from '../domain/dates';
import type { State } from '../domain/types';
import { reducer, type Action } from './reducer';
import { seed, STATE_VERSION } from './seed';

export const STORAGE_KEY = 'maoqiuwu:state';

export function loadState(): State | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as State;
    return s.version === STATE_VERSION ? s : null;
  } catch {
    return null;
  }
}

interface Ctx { state: State; dispatch: Dispatch<Action>; today: ISODate }
const StoreCtx = createContext<Ctx | null>(null);

export function StoreProvider({ children, initial, today }: { children: ReactNode; initial?: State; today?: ISODate }) {
  const day = today ?? todayISO();
  const [state, dispatch] = useReducer(reducer, undefined, () => initial ?? loadState() ?? seed(day));
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, toast: undefined }));
    } catch {
      /* 存储空间不足时不影响使用 */
    }
  }, [state]);
  return <StoreCtx.Provider value={{ state, dispatch, today: day }}>{children}</StoreCtx.Provider>;
}

export function useStore(): Ctx {
  const c = useContext(StoreCtx);
  if (!c) throw new Error('useStore 必须在 StoreProvider 内使用');
  return c;
}
