/**
 * Local "match starting soon" reminders.
 * Everything is stored on the device — no server, no cost, no setup for players.
 */

const ENABLED_KEY = "darts:reminders";
const FIRED_KEY = "darts:reminders:fired";

export function remindersEnabled() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(ENABLED_KEY) === "1";
}

export function setRemindersEnabled(on: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ENABLED_KEY, on ? "1" : "0");
  window.dispatchEvent(new CustomEvent("darts:reminders-changed"));
}

export function notificationsSupported() {
  return typeof window !== "undefined" && "Notification" in window;
}

export function notificationPermission(): NotificationPermission | "unsupported" {
  if (!notificationsSupported()) return "unsupported";
  return Notification.permission;
}

export async function requestNotificationPermission() {
  if (!notificationsSupported()) return "unsupported" as const;
  return await Notification.requestPermission();
}

function firedSet(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    return new Set(JSON.parse(window.localStorage.getItem(FIRED_KEY) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}

export function hasFired(key: string) {
  return firedSet().has(key);
}

/** Remember an alert so it only ever fires once per device (keeps the last 200). */
export function markFired(key: string) {
  if (typeof window === "undefined") return;
  const all = Array.from(firedSet());
  all.push(key);
  window.localStorage.setItem(FIRED_KEY, JSON.stringify(all.slice(-200)));
}

export function notify(title: string, body: string) {
  if (!notificationsSupported() || Notification.permission !== "granted") return;
  try {
    new Notification(title, { body, icon: "/favicon.png", tag: title });
  } catch {
    /* some browsers only allow notifications from a service worker */
  }
}
