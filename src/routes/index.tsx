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
  if (!mounted) return <div style={{ minHeight: "100vh", background: "#0B1220" }} />;
  return <Pyscal />;
}
