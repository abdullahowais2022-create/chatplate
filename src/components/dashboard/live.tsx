"use client";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Live = { version: number; unreadNotifications: number; attention: number };
const LiveContext = createContext<Live>({ version: 0, unreadNotifications: 0, attention: 0 });
export const useLive = () => useContext(LiveContext);

/**
 * Polls /api/live every few seconds. When the restaurant's change cursor moves, server components
 * refresh and client components listening to `version` refetch. Pauses while the tab is hidden.
 */
export function LiveProvider({ children, initial }: { children: React.ReactNode; initial: Live }) {
  const router = useRouter();
  const [live, setLive] = useState<Live>(initial);
  const version = useRef(initial.version);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let stopped = false;
    const tick = async () => {
      if (!document.hidden) {
        try {
          const res = await fetch("/api/live", { cache: "no-store" });
          if (res.status === 401) {
            window.location.href = "/login";
            return;
          }
          const json = (await res.json()) as { data: Live };
          if (json.data) {
            setLive(json.data);
            if (json.data.version !== version.current) {
              version.current = json.data.version;
              router.refresh();
            }
          }
        } catch {
          /* offline: try again next tick */
        }
      }
      if (!stopped) timer = setTimeout(tick, 4000);
    };
    timer = setTimeout(tick, 4000);
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [router]);

  return <LiveContext.Provider value={live}>{children}</LiveContext.Provider>;
}
