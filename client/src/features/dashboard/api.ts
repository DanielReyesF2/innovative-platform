import { useQuery } from "@tanstack/react-query";

export function useDashboardSummary() {
  return useQuery({
    queryKey: ["/api/dashboard/summary"],
    staleTime: 2 * 60 * 1000,
  });
}

export function useDashboardStats(period = "month") {
  return useQuery({
    queryKey: ["/api/dashboard/stats", { period }],
    staleTime: 2 * 60 * 1000,
  });
}
