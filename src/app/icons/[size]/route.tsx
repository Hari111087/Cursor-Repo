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
      <div style={{ width: size, height: size, display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(160deg,#030608,#0A1418)", borderRadius: maskable ? 0 : size * 0.22 }}>
        <div style={{ width: ring, height: ring, borderRadius: "50%", border: `${Math.max(2, size * 0.03)}px solid #2EE6E6`, boxShadow: `0 0 ${size * 0.12}px #2EE6E6`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: ring * 0.62, height: ring * 0.62, borderRadius: "50%", border: `${Math.max(2, size * 0.02)}px solid #FF8A1F`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: ring * 0.3, height: ring * 0.3, borderRadius: "50%", background: "radial-gradient(circle,#ffffff 0%,#2EE6E6 45%,#FF2A4D 100%)", boxShadow: `0 0 ${size * 0.08}px #2EE6E6` }} />
          </div>
        </div>
      </div>
    ),
    { width: size, height: size, headers: { "Cache-Control": "public, max-age=604800, immutable" } },
  );
}
