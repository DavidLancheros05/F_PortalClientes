import { useState, useCallback, useRef } from "react";

export interface UseFetchOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  autoExecute?: boolean;
}

export interface UseFetchState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

/**
 * Hook para manejar llamadas asincrónicas con loading, error, y callbacks
 * Centraliza el patrón de try/catch/finally usado en todas partes
 *
 * @example
 * const { data, loading, error, execute } = useFetch(
 *   () => rolesService.getAll(),
 *   { onSuccess: () => console.log("Listo") }
 * );
 *
 * useEffect(() => {
 *   execute();
 * }, [execute]);
 */
export function useFetch<T>(
  asyncFn: () => Promise<T>,
  options: UseFetchOptions<T> = {},
) {
  const [state, setState] = useState<UseFetchState<T>>({
    data: null,
    loading: options.autoExecute ?? false,
    error: null,
  });

  const asyncFnRef = useRef(asyncFn);
  asyncFnRef.current = asyncFn;
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const execute = useCallback(async () => {
    setState({ data: null, loading: true, error: null });
    try {
      const result = await asyncFnRef.current();
      setState({ data: result, loading: false, error: null });
      optionsRef.current.onSuccess?.(result);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setState({ data: null, loading: false, error });
      optionsRef.current.onError?.(error);
      throw error;
    }
  }, []);

  return {
    ...state,
    execute,
    isLoading: state.loading,
  };
}

/**
 * Hook para funciones que retornan void (POST, PUT, DELETE sin retorno importante)
 */
export function useMutation<TPayload, TResponse = void>(
  mutationFn: (payload: TPayload) => Promise<TResponse>,
  options: UseFetchOptions<TResponse> = {},
) {
  const [state, setState] = useState<UseFetchState<TResponse>>({
    data: null,
    loading: false,
    error: null,
  });

  const mutationFnRef = useRef(mutationFn);
  mutationFnRef.current = mutationFn;
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const mutate = useCallback(async (payload: TPayload) => {
    setState({ data: null, loading: true, error: null });
    try {
      const result = await mutationFnRef.current(payload);
      setState({ data: result, loading: false, error: null });
      optionsRef.current.onSuccess?.(result);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setState({ data: null, loading: false, error });
      optionsRef.current.onError?.(error);
      throw error;
    }
  }, []);

  return {
    ...state,
    mutate,
    isLoading: state.loading,
  };
}
