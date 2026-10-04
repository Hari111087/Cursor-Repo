import { ShieldAlert } from "lucide-react";

export const FINANCE_DISCLAIMER = "Informational only, not financial advice. Consult a registered advisor.";

export function Disclaimer({ className = "" }: { className?: string }) {
  return (
    <p role="note" className={`flex items-start gap-2 rounded-md border border-gold/30 bg-gold/10 px-3 py-2 text-xs text-gold ${className}`}>
      <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      {FINANCE_DISCLAIMER}
    </p>
  );
}
