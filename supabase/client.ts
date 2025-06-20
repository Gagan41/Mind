import { createBrowserClient } from "@supabase/ssr";

export const createClient = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          const cookie = document.cookie
            .split("; ")
            .find((row) => row.startsWith(`${name}=`));
          return cookie ? decodeURIComponent(cookie.split("=")[1]) : "";
        },
        set(name: string, value: string, options: { path?: string; maxAge?: number }) {
          document.cookie = `${name}=${encodeURIComponent(value)}; path=${options.path || "/"}; max-age=${options.maxAge || 3600}`;
        },
        remove(name: string, options: { path?: string }) {
          document.cookie = `${name}=; path=${options.path || "/"}; max-age=0`;
        },
      },
    }
  );
