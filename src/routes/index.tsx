import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import Pyscal from "@/components/Pyscal";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "PYSCAL · Pyramid Bid Calculator" },
      { name: "description", content: "Kalkulator pyramid averaging-down untuk trader IDX. Local-only, no signup." },
    ],
  }),
});

function Index() {
  // Client-only mount: Pyscal touches localStorage/navigator extensively
  // and the original component was never SSR-tested. Render after mount.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) {
    return (
      <main style={{ minHeight: "100vh", background: "#0B1220", color: "#E5E7EB", padding: "24px" }}>
        <h1 style={{ fontSize: "28px", fontWeight: 700, margin: 0 }}>PYSCAL</h1>
        <p style={{ marginTop: 8, opacity: 0.8 }}>Pyramid Bid Calculator untuk trader IDX.</p>
      </main>
    );
  }
  return (
    <main>
      <Pyscal />
    </main>
  );
}
