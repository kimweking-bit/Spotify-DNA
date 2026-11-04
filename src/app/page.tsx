import { Hero } from "@/components/hero";
import { ImportSection } from "@/components/import-section";
import { InsightsSection } from "@/components/insights-section";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { TrustSection } from "@/components/trust-section";

/**
 * Homepage composition. Section UI lives in dedicated components.
 * The album wall is owned by Hero as the signature visual — not a second carousel.
 */
export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main>
        <Hero />
        <InsightsSection />
        <ImportSection />
        <TrustSection />
      </main>
      <SiteFooter />
    </>
  );
}
