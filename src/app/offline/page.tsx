export const metadata = { title: "Offline" };

export default function Offline() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="text-2xl text-gradient">Signal lost</h1>
      <p className="max-w-sm text-sm text-muted-foreground">You&apos;re offline. Jarvis will reconnect automatically when your network is back.</p>
    </main>
  );
}
