import { useQuery } from "@tanstack/react-query";

export function useNovaStatus() {
  return useQuery({
    queryKey: ["/api/nova/status"],
    staleTime: 60 * 1000, // 1 minute
  });
}
