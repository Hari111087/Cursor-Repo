import { AppShell } from "@/components/app-shell";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell demo={env.demo}>{children}</AppShell>;
}
