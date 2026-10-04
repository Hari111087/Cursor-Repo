import { CalendarClock, LayoutDashboard, LineChart, Mail, Settings } from "lucide-react";

export const NAV = [
  { href: "/", label: "Command", icon: LayoutDashboard },
  { href: "/time", label: "Time", icon: CalendarClock },
  { href: "/email", label: "Email", icon: Mail },
  { href: "/markets", label: "Markets", icon: LineChart },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;
