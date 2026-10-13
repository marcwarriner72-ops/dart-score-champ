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

      <nav
        aria-label="Main"
        className="fixed bottom-[calc(0.75rem+env(safe-area-inset-bottom))] left-1/2 z-20 w-[calc(100%-1.5rem)] max-w-md -translate-x-1/2 rounded-full border border-border/70 bg-card/80 p-1.5 shadow-[var(--shadow-panel)] backdrop-blur-xl"
      >
        <div className="grid grid-cols-6 gap-0.5">
          <NavItem to="/dashboard" icon={<Target className="size-5" />} label="Home" />
          <NavItem to="/predict" icon={<ListChecks className="size-5" />} label="Predict" badge={toPredict} />
          <NavItem to="/results" icon={<Archive className="size-5" />} label="Results" />
          <NavItem to="/chat" icon={<MessageCircle className="size-5" />} label="Chat" />
          <NavItem to="/leaderboard" icon={<Trophy className="size-5" />} label="Table" />
          {isAdmin ? (
            <NavItem to="/admin" icon={<Shield className="size-5" />} label="Admin" />
          ) : (
            <NavItem to="/rules" icon={<Shield className="size-5" />} label="Rules" />
          )}
        </div>
      </nav>
    </div>
  );
}

function NavItem({
  to,
  icon,
  label,
  badge,
}: {
  to: string;
  icon: ReactNode;
  label: string;
  badge?: number;
}) {
  return (
    <Link
      to={to}
      className="relative flex flex-col items-center gap-0.5 rounded-full py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground transition-all duration-200 active:scale-90"
      activeProps={{
        className: "bg-gold/15 text-gold shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--gold)_35%,transparent)]",
      }}
    >
      <span className="relative">
        {icon}
        {badge ? (
          <span className="absolute -right-2.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[9px] font-bold leading-none text-accent-foreground ring-2 ring-card">
            {badge > 9 ? "9+" : badge}
          </span>
        ) : null}
      </span>
      {label}
    </Link>
  );
}
