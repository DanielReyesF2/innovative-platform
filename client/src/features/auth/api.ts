import { useQuery } from "@tanstack/react-query";

// Query to get the current user profile
export function useCurrentUser() {
  return useQuery({
    queryKey: ["/api/auth/user"],
    staleTime: 5 * 60 * 1000,
  });
}

// Query to get all users (admin)
export function useUsers() {
  return useQuery({
    queryKey: ["/api/auth/users"],
    staleTime: 2 * 60 * 1000,
  });
}
