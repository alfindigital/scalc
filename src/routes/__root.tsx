import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "theme-color", content: "#0B1220" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "PYSCAL" },
      { title: "PYSCAL — Pyramid Bid Calculator untuk Trader IDX" },
      { name: "description", content: "PYSCAL adalah kalkulator pyramid averaging-down untuk trader saham IDX. Hitung bid berlapis, simpan history, dan jalankan offline — gratis dan tanpa daftar." },
      { property: "og:title", content: "PYSCAL — Pyramid Bid Calculator untuk Trader IDX" },
      { property: "og:description", content: "Kalkulator pyramid averaging-down untuk trader IDX. Hitung bid berlapis, simpan history, jalankan offline — gratis & tanpa signup." },
      { property: "og:url", content: "https://scalc.alfindigital.com/" },
      { property: "og:site_name", content: "PYSCAL" },
      { property: "og:type", content: "website" },
      { property: "og:locale", content: "id_ID" },
      { name: "twitter:title", content: "PYSCAL — Pyramid Bid Calculator untuk Trader IDX" },
      { name: "twitter:description", content: "Kalkulator pyramid averaging-down untuk trader IDX. Hitung bid berlapis, simpan history, jalankan offline." },
      { property: "og:image", content: "https://scalc.alfindigital.com/og-image.jpg" },
      { property: "og:image:width", content: "1216" },
      { property: "og:image:height", content: "640" },
      { property: "og:image:alt", content: "PYSCAL — Pyramid Bid Calculator untuk trader saham IDX" },
      { name: "twitter:image", content: "https://scalc.alfindigital.com/og-image.jpg" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "google-site-verification", content: "J-Czc4w4Dto_XXTUZfW8lAMoT45CpTWqZ72Nt91yFbw" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "icon", href: "/favicon.ico", sizes: "any" },
      { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon-32.png" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Funnel+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap",
      },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "PYSCAL",
          description:
            "Kalkulator pyramid averaging-down untuk trader saham IDX. Hitung bid berlapis, simpan history, jalankan offline.",
          applicationCategory: "FinanceApplication",
          operatingSystem: "Web",
          url: "https://scalc.alfindigital.com/",
          inLanguage: "id-ID",
          offers: { "@type": "Offer", price: "0", priceCurrency: "IDR" },
        }),
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <script
          // Pre-hydration theme: prevent FOUC by applying saved theme
          // (or system preference) to <html> before React mounts.
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var t=localStorage.getItem('pyscal_theme');if(t!=='dark'&&t!=='light'){t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}document.documentElement.dataset.pyscalTheme=t;document.documentElement.style.colorScheme=t;}catch(e){}try{var m='auto';var eff=matchMedia('(prefers-reduced-motion: reduce)').matches?'reduce':'normal';document.documentElement.setAttribute('data-pyscal-motion',m);document.documentElement.setAttribute('data-pyscal-motion-effective',eff);}catch(e){}})();",
          }}
        />
        <HeadContent />
      </head>
      <body>
        <a href="#main" className="pyscal-sr-only">Langsung ke konten</a>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <Toaster position="top-center" richColors closeButton />
    </QueryClientProvider>
  );
}
