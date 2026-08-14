import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldOff } from "lucide-react";
import { Footer } from "@/components/site/Footer";
import { Navigation } from "@/components/site/Navigation";
import { getVerificationProvider, VERIFICATION_STATE_LABEL } from "@/lib/payments/verification";

const title = "Verification — IRS";
const description =
  "Payment verification is inactive at IRS. Every capability is free and unlocked; this page documents the future verification surface without requesting anything.";

export const Route = createFileRoute("/verify")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: VerifyPage,
});

function VerifyPage() {
  const provider = getVerificationProvider();

  return (
    <div className="min-h-screen">
      <Navigation />
      <main className="mx-auto max-w-3xl px-4 pt-16 sm:px-6">
        <p className="label-mono">Verification</p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight">
          Nothing to verify.
        </h1>
        <p className="mt-4 text-muted-foreground">
          IRS does not charge for anything today. There is no payment, no wallet, no transaction
          and no capability locked behind one. This page exists only so the verification surface is
          documented and inspectable.
        </p>

        <div className="panel mt-8 p-6">
          <div className="flex items-start gap-4">
            <ShieldOff className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <p className="font-display text-base font-semibold tracking-tight">
                Verification provider is disabled
              </p>
              <dl className="mt-4 grid gap-x-6 gap-y-2 font-mono text-[11px] sm:grid-cols-2">
                <div className="flex justify-between border-b border-border pb-1">
                  <dt className="text-muted-foreground">Provider</dt>
                  <dd>{provider.id}</dd>
                </div>
                <div className="flex justify-between border-b border-border pb-1">
                  <dt className="text-muted-foreground">State</dt>
                  <dd>{VERIFICATION_STATE_LABEL.disabled}</dd>
                </div>
                <div className="flex justify-between border-b border-border pb-1">
                  <dt className="text-muted-foreground">Enabled</dt>
                  <dd>{String(provider.enabled)}</dd>
                </div>
                <div className="flex justify-between border-b border-border pb-1">
                  <dt className="text-muted-foreground">Networks</dt>
                  <dd>{provider.supportedNetworks().length || "none"}</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>

        <p className="mt-6 text-sm text-muted-foreground">
          Every system in the laboratory is fully usable right now.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Link
            to="/analyze"
            className="border border-primary/60 bg-primary/10 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-primary hover:bg-primary/20"
          >
            Open ATLAS
          </Link>
          <Link
            to="/products"
            className="border border-border px-4 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground"
          >
            See all products
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
