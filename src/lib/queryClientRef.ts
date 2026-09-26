import type { QueryClient } from "@tanstack/react-query";

/** The app's query client, for code that runs outside React (a notification button tapped while the app was closed). */
let shared: QueryClient | null = null;
export const setSharedQueryClient = (client: QueryClient) => {
  shared = client;
};
export const getSharedQueryClient = (): QueryClient | null => shared;
