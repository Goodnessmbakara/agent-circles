import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

export function usePools() {
  return useQuery({
    queryKey: ["pools"],
    queryFn: api.listPools,
  });
}

export function usePool(id: string) {
  return useQuery({
    queryKey: ["pool", id],
    queryFn: () => api.getPool(id),
    enabled: !!id,
    refetchInterval: 10_000,
  });
}
