import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

export const runtime = "edge";

/** Generates PNG app icons (arc-reactor glyph) at any size: /icons/192, /icons/512?maskable=1 */
export function GET(req: NextRequest, { params }: { params: { size: string } }) {
  const size = Math.min(Math.max(Number(params.size) || 192, 16), 1024);
  const maskable = req.nextUrl.searchParams.has("maskable");
  const ring = size * (maskable ? 0.5 : 0.72);
  return new ImageResponse(
    (
      <div style={{ width: size, height: size, display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(160deg,#0A0E27,#111735)", borderRadius: maskable ? 0 : size * 0.22 }}>
        <div style={{ width: ring, height: ring, borderRadius: "50%", border: `${Math.max(2, size * 0.03)}px solid #00E5FF`, boxShadow: `0 0 ${size * 0.12}px #00E5FF`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: ring * 0.62, height: ring * 0.62, borderRadius: "50%", border: `${Math.max(2, size * 0.02)}px solid #8B5CF6`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: ring * 0.3, height: ring * 0.3, borderRadius: "50%", background: "radial-gradient(circle,#ffffff 0%,#00E5FF 45%,#FF2E97 100%)", boxShadow: `0 0 ${size * 0.08}px #00E5FF` }} />
          </div>
        </div>
      </div>
    ),
    { width: size, height: size, headers: { "Cache-Control": "public, max-age=604800, immutable" } },
  );
}
