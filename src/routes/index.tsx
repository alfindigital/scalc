import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState } from "react";
import { toast } from "sonner";
import { setupPWA, bindInstallPrompt, onUpdateAvailable, applyUpdate } from "@/lib/pwa";

const Pyscal = lazy(() => import("@/components/Pyscal"));
const Footer = lazy(() => import("@/components/Footer"));

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "PYSCAL — Pyramid Bid Calculator untuk Trader IDX" },
      { name: "description", content: "Kalkulator pyramid averaging-down untuk trader saham IDX. Hitung bid berlapis, simpan history, dan jalankan offline tanpa daftar." },
      { property: "og:url", content: "https://scalc.alfindigital.com/" },
    ],
    links: [
      { rel: "canonical", href: "https://scalc.alfindigital.com/" },
    ],
  }),
});

function Index() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    setupPWA();
    const unbind = bindInstallPrompt();
    const unsubUpdate = onUpdateAvailable(() => {
      toast("Versi baru PYSCAL tersedia", {
        id: "sw-update-toast",
        description: "Reload untuk pakai versi terbaru. Kalkulator offline tetap jalan sampai kamu reload.",
        duration: Infinity,
        action: {
          label: "Reload sekarang",
          onClick: () => applyUpdate(),
        },
      });
    });
    return () => {
      unbind();
      unsubUpdate();
    };
  }, []);
  return (
    <>
      <main id="main">
        {mounted ? (
          <Suspense fallback={null}>
            <Pyscal />
          </Suspense>
        ) : null}
      </main>
      {mounted ? (
        <Suspense fallback={null}>
          <Footer />
        </Suspense>
      ) : null}
    </>
  );
}
