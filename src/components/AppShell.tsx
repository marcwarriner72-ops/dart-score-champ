import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut, Target, Trophy, ListChecks, Shield, MessageCircle, Archive, Menu, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin, useMatches, useMyPredictions, useProfile, useSession } from "@/lib/league";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { NextUpStrip, useMatchReminders } from "@/components/MatchReminders";
import { Button } from "@/components/ui/button";


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


  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col">
      <header className="sticky top-0 z-20 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-border/60 bg-background/80 px-4 py-3 backdrop-blur-md">
        <Link to="/profile" aria-label="Your profile">
          <PlayerAvatar path={profile?.avatar_url} name={profile?.display_name} className="size-10" />
        </Link>
        <div className="min-w-0">
          <Link
            to="/profile"
            className="block truncate text-[11px] font-semibold uppercase tracking-[0.18em] text-primary underline-offset-2 hover:underline"
          >
            {profile?.display_name ? `Hi, ${profile.display_name}` : "Darts Predictor League"}
          </Link>
          <h1 className="truncate font-display text-2xl font-bold uppercase">{title}</h1>
          {subtitle ? (
            <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
        <Button variant="ghost" size="icon" onClick={signOut} aria-label="Sign out">
          <LogOut className="size-5" />
        </Button>
      </header>

      <NextUpStrip />

      <main className="flex-1 px-4 pb-32 pt-4">{children}</main>

      <DockNav isAdmin={!!isAdmin} toPredict={toPredict} />
    </div>
  );
}

function DockNav({ isAdmin, toPredict }: { isAdmin: boolean; toPredict: number }) {
  const [open, setOpen] = useState(false);

  const items = [
    { to: "/dashboard", icon: <Target className="size-5" />, label: "Home" },
    { to: "/predict", icon: <ListChecks className="size-5" />, label: "Predict", badge: toPredict },
    { to: "/results", icon: <Archive className="size-5" />, label: "Results" },
    { to: "/chat", icon: <MessageCircle className="size-5" />, label: "Chat" },
    { to: "/leaderboard", icon: <Trophy className="size-5" />, label: "Table" },
    isAdmin
      ? { to: "/admin", icon: <Shield className="size-5" />, label: "Admin" }
      : { to: "/rules", icon: <Shield className="size-5" />, label: "Rules" },
  ];

  return (
    <nav
      aria-label="Main"
      className="fixed bottom-[calc(0.75rem+env(safe-area-inset-bottom))] left-3 z-20 flex flex-col-reverse items-start gap-2"
    >
      <button
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="relative flex size-14 items-center justify-center rounded-full border border-border/70 bg-card/85 text-foreground shadow-[var(--shadow-panel)] backdrop-blur-xl transition-transform duration-200 active:scale-90"
      >
        {open ? <X className="size-6" /> : <Menu className="size-6" />}
        {!open && toPredict > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold leading-none text-accent-foreground ring-2 ring-card">
            {toPredict > 9 ? "9+" : toPredict}
          </span>
        ) : null}
      </button>

      {items.map((item, i) => (
        <Link
          key={item.to}
          to={item.to}
          onClick={() => setOpen(false)}
          aria-hidden={!open}
          tabIndex={open ? 0 : -1}
          style={{ transitionDelay: open ? `${i * 35}ms` : "0ms" }}
          className={`flex items-center gap-2.5 rounded-full border border-border/70 bg-card/85 py-2 pl-2 pr-4 shadow-[var(--shadow-panel)] backdrop-blur-xl transition-all duration-200 active:scale-90 ${
            open
              ? "translate-y-0 scale-100 opacity-100"
              : "pointer-events-none translate-y-4 scale-75 opacity-0"
          }`}
          activeProps={{
            className: "border-gold/50 text-gold",
          }}
        >
          <span className="relative flex size-9 items-center justify-center rounded-full bg-secondary text-foreground">
            {item.icon}
            {item.badge ? (
              <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[9px] font-bold leading-none text-accent-foreground ring-2 ring-card">
                {item.badge > 9 ? "9+" : item.badge}
              </span>
            ) : null}
          </span>
          <span className="text-xs font-semibold uppercase tracking-wide">{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}
