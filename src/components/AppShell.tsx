import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut, Target, Trophy, ListChecks, MessageCircle, Archive, BookOpen, Settings, Wrench, ChevronUp, Tv } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin, useMatches, useMyPredictions, useProfile, useSession } from "@/lib/league";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { NextUpStrip, useMatchReminders } from "@/components/MatchReminders";
import { Button } from "@/components/ui/button";
import { NewsTicker } from "@/components/News";
import { usePushListener } from "@/components/Push";
import { usePalette } from "@/lib/palette";


export function AppShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: user } = useSession();
  usePalette();
  const { data: profile } = useProfile(user?.id);
  const { data: isAdmin } = useIsAdmin(user?.id);
  const { data: matches = [] } = useMatches();
  const { data: myPicks = [] } = useMyPredictions(user?.id);
  const now = Date.now();
  const toPredict = matches.filter(
    (m) =>
      m.status === "upcoming" &&
      new Date(m.starts_at).getTime() > now &&
      !myPicks.some((p) => p.match_id === m.id),
  ).length;
  useMatchReminders();
  usePushListener();


  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 pb-4 pt-5 sm:px-6">
        <div className="relative min-w-0 overflow-hidden">
          <Link to="/profile" className="mb-1 block truncate text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-primary">
            {profile?.display_name ? `Hi, ${profile.display_name} · Darts Predictor League` : "Darts Predictor League"}
          </Link>
          <h1 className="truncate font-display text-4xl leading-none">{title}</h1>
          {subtitle ? <p className="mt-1 truncate text-xs text-muted-foreground">{subtitle}</p> : null}
        </div>
        <div className="flex items-center gap-1">
          <Link to="/profile" aria-label="Your profile">
            <PlayerAvatar path={profile?.avatar_url} name={profile?.display_name} className="size-10" />
          </Link>
          <Button variant="ghost" size="icon" onClick={signOut} aria-label="Sign out">
            <LogOut className="size-5" />
          </Button>
        </div>
      </header>

      <NewsTicker />
      <NextUpStrip />

      <main className="flex-1 px-4 pb-[calc(5rem+env(safe-area-inset-bottom))] pt-4 sm:px-6">{children}</main>

      <Taskbar isAdmin={!!isAdmin} toPredict={toPredict} />
    </div>
  );
}

function Taskbar({ isAdmin, toPredict }: { isAdmin: boolean; toPredict: number }) {
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState("");
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    const tick = () => setNow(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    tick();
    const t = setInterval(tick, 30000);
    return () => clearInterval(t);
  }, []);

  const items = [
    { to: "/dashboard", icon: Target, label: "League Dashboard" },
    { to: "/predict", icon: ListChecks, label: "Make Predictions", badge: toPredict },
    { to: "/results", icon: Archive, label: "Results & Archive" },
    { to: "/leaderboard", icon: Trophy, label: "League Table" },
    { to: "/chat", icon: MessageCircle, label: "Live Chatroom" },
    { to: "/media", icon: Tv, label: "Sports Media Dock" },
    { to: "/rules", icon: BookOpen, label: "Official Rulebook" },
    { to: "/profile", icon: Settings, label: "My Profile & Settings" },
    ...(isAdmin ? [{ to: "/admin", icon: Wrench, label: "Admin Command Center" }] : []),
  ] as const;
  const active = items.find((i) => pathname.startsWith(i.to)) ?? items[0];
  const ActiveIcon = active.icon;

  return (
    <footer className="race-taskbar fixed inset-x-0 bottom-0 z-40 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 border-t-2 border-border bg-secondary p-2 pb-[calc(.5rem+env(safe-area-inset-bottom))] text-secondary-foreground">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" aria-label="Start menu" className="retro-start relative h-11 gap-2 rounded-none border-2 px-3 font-bold">
            <Target className="text-primary" />Start
            <ChevronUp className={`transition-transform ${open ? "rotate-180" : ""}`} />
            {toPredict > 0 ? (
              <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center bg-accent px-1 text-[10px] font-bold text-accent-foreground">
                {toPredict > 9 ? "9+" : toPredict}
              </span>
            ) : null}
          </Button>
        </PopoverTrigger>
        <PopoverContent side="top" align="start" sideOffset={10} className="w-[min(330px,calc(100vw-16px))] rounded-none border-2 p-0">
          <nav aria-label="Start menu" className="grid grid-cols-[28px_minmax(0,1fr)]">
            <div className="flex items-center justify-center bg-primary text-primary-foreground">
              <span className="rotate-180 whitespace-nowrap font-display text-lg [writing-mode:vertical-rl]">Darts Predictor League</span>
            </div>
            <div className="py-2">
              {items.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setOpen(false)}
                    aria-current={active.to === item.to ? "page" : undefined}
                    className={`flex h-12 items-center gap-3 px-4 text-sm hover:bg-muted ${active.to === item.to ? "bg-muted font-semibold" : ""}`}
                  >
                    <Icon className="size-4 text-primary" />
                    <span className="flex-1">{item.label}</span>
                    {"badge" in item && item.badge ? (
                      <span className="bg-accent px-1.5 text-[10px] font-bold text-accent-foreground">{item.badge}</span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </nav>
        </PopoverContent>
      </Popover>
      <div className="flex min-w-0 items-center gap-2 border-l border-border pl-2">
        <ActiveIcon className="size-4 shrink-0 text-primary" />
        <span className="truncate text-xs font-medium">{active.label}</span>
      </div>
      <time className="shrink-0 border-l border-border px-2 text-xs tabular-nums">{now}</time>
    </footer>
  );
}
