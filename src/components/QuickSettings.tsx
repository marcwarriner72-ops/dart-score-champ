import { useEffect, useState } from "react";
import { Bell, Settings, Timer, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useNudgeSettings } from "@/components/Push";
import { notificationPermission, remindersEnabled, requestNotificationPermission, setRemindersEnabled } from "@/lib/reminders";
import { playThwack, setSoundEnabled, soundEnabled } from "@/lib/sound";

export function QuickSettings() {
  const nudge = useNudgeSettings();
  const [match, setMatch] = useState(false);
  const [sound, setSound] = useState(false);
  const [permission, setPermission] = useState<string>("default");
  const [pending, setPending] = useState(false);

  function refresh() {
    setMatch(remindersEnabled());
    setSound(soundEnabled());
    setPermission(notificationPermission());
  }
  useEffect(() => { refresh(); }, []);

  async function toggleMatch(next: boolean) {
    setPending(true);
    try {
      if (next) {
        const result = await requestNotificationPermission();
        setPermission(result);
        if (result === "denied") {
          toast.error("Notifications are blocked in your browser settings");
          return;
        }
      }
      setRemindersEnabled(next);
      setMatch(next);
      toast.success(next ? "Match reminders on" : "Match reminders off");
    } catch {
      toast.error("Could not change Match Reminders");
    } finally {
      setPending(false);
    }
  }

  return (
    <Popover onOpenChange={(open) => { if (open) refresh(); }}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Quick settings" title="Quick settings">
          <Settings className="size-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-[min(320px,calc(100vw-32px))] p-4" aria-label="Quick settings">
        <h2 className="mb-3 font-display text-2xl uppercase">Quick settings</h2>
        <div className="divide-y divide-border">
          <div className="flex items-center gap-3 py-3">
            <Bell className="size-5 shrink-0 text-primary" />
            <label htmlFor="quick-nudge" className="flex-1 text-sm font-semibold">Nudge reminders</label>
            <Switch id="quick-nudge" checked={nudge.enabled} disabled={nudge.disabled} onCheckedChange={nudge.setEnabled} aria-label="Nudge reminders" />
          </div>
          <div className="flex items-center gap-3 py-3">
            <Timer className="size-5 shrink-0 text-accent" />
            <label htmlFor="quick-match" className="flex-1 text-sm font-semibold">Match Reminders</label>
            <Switch id="quick-match" checked={match} disabled={pending} onCheckedChange={toggleMatch} aria-label="Match Reminders" />
          </div>
          <div className="flex items-center gap-3 py-3">
            <Volume2 className="size-5 shrink-0 text-primary" />
            <label htmlFor="quick-sound" className="flex-1 text-sm font-semibold">Pub Sounds</label>
            <Switch id="quick-sound" checked={sound} aria-label="Pub Sounds" onCheckedChange={(next) => {
              setSoundEnabled(next);
              setSound(next);
              if (next) playThwack();
              toast.success(next ? "Pub Sounds on" : "Pub Sounds off");
            }} />
          </div>
        </div>
        {permission === "denied" && <p className="mt-2 text-xs text-destructive">Notifications are blocked. Allow them for this site in your browser settings.</p>}
        {permission === "unsupported" && <p className="mt-2 text-xs text-muted-foreground">Device notifications aren't available in this browser. Match reminders still appear inside the app.</p>}
      </PopoverContent>
    </Popover>
  );
}