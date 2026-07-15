import { ImageResponse } from "next/og";
import { brand } from "@/lib/brand";

export const alt = `${brand.name} — Développeur Web`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 80,
          background: "linear-gradient(135deg, #0a0a0a 0%, #1a1510 50%, #0a0a0a 100%)",
          color: "#fafafa",
          fontFamily: "Georgia, serif",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 22,
            letterSpacing: 4,
            textTransform: "uppercase",
            color: "#c9a876",
            marginBottom: 32,
          }}
        >
          Portfolio
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 72,
            fontWeight: 700,
            lineHeight: 1.1,
            maxWidth: 900,
          }}
        >
          {brand.name}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 24,
            fontSize: 32,
            lineHeight: 1.4,
            color: "rgba(250,250,250,0.75)",
            maxWidth: 800,
          }}
        >
          {brand.tagline} · Sites & applications sur-mesure
        </div>
        <div
          style={{
            display: "flex",
            marginTop: "auto",
            fontSize: 24,
            color: "#c9a876",
            alignSelf: "flex-end",
          }}
        >
          zishi.dev
        </div>
      </div>
    ),
    { ...size }
  );
}
