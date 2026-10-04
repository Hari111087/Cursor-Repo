"use client";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Orb } from "@/components/hud/orb";
import { HudBackground } from "@/components/hud/background";
import { Button } from "@/components/ui/button";

function LoginInner() {
  const params = useSearchParams();
  const error = params.get("error");
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-10 p-6">
      <HudBackground />
      <Orb size={200} />
      <div className="glass w-full max-w-sm rounded-xl p-6 text-center">
        <h1 className="text-xl font-bold text-gradient">HARI&apos;S ASSISTANT</h1>
        <p className="mt-2 text-sm text-muted-foreground">Authenticate to bring Jarvis online.</p>
        {error && (
          <p className="mt-3 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
            {error === "AccessDenied" ? "This Google account isn't authorized." : "Sign-in failed. Please try again."}
          </p>
        )}
        <Button className="mt-6 w-full" size="lg" onClick={() => signIn("google", { callbackUrl: params.get("callbackUrl") ?? "/" })}>
          Continue with Google
        </Button>
        <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
          Requests read-only Gmail, send-on-approval and Calendar event access. Tokens are encrypted at rest.
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginInner />
    </Suspense>
  );
}
