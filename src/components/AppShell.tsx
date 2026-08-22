import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut, Target, Trophy, ListChecks, Shield, MessageCircle, Archive } from "lucide-react";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin, useProfile, useSession } from "@/lib/league";
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

      <main className="flex-1 px-4 pb-28 pt-4">{children}</main>


      <nav className="fixed bottom-0 left-1/2 z-20 w-full max-w-lg -translate-x-1/2 border-t border-border/60 bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md">
        <div className="grid grid-cols-6">
          <NavItem to="/dashboard" icon={<Target className="size-5" />} label="Home" />
          <NavItem to="/predict" icon={<ListChecks className="size-5" />} label="Predict" />
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

function NavItem({ to, icon, label }: { to: string; icon: ReactNode; label: string }) {
  return (
    <Link
      to={to}
      className="flex flex-col items-center gap-1 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground transition-colors"
      activeProps={{ className: "text-primary" }}
    >
      {icon}
      {label}
    </Link>
  );
}
