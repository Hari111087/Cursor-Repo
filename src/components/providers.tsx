"use client";
import { ThemeProvider } from "next-themes";
import { SessionProvider } from "next-auth/react";
import { AssistantProvider } from "./assistant-provider";
import { PwaRegister } from "./pwa";
import { ToastProvider } from "./toast";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} themes={["dark", "light"]}>
        <ToastProvider>
          <AssistantProvider>
            {children}
            <PwaRegister />
          </AssistantProvider>
        </ToastProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
