"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/** Replace this body when you have final Terms of Service copy. */
function TermsPlaceholderBody() {
  return (
    <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
      <p className="text-xs text-muted-foreground/90">
        <span className="font-medium text-foreground">Placeholder — </span>
        Replace this document with your final Terms of Service.
      </p>
      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground">1. Agreement</h3>
        <p>
          By accessing or using MyDevTools, you agree to be bound by these Terms of Service and our
          Privacy Policy. If you do not agree, please do not use the service.
        </p>
      </section>
      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground">2. Use of the service</h3>
        <p>
          You agree to use the service only for lawful purposes and in a way that does not infringe
          the rights of others or restrict their use of the service. We may suspend or terminate
          access for conduct that we reasonably believe violates these terms or harms other users or
          the service.
        </p>
      </section>
      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground">3. Changes</h3>
        <p>
          We may update these terms from time to time. Continued use of the service after changes
          constitutes acceptance of the revised terms. We encourage you to review this page
          periodically.
        </p>
      </section>
      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground">4. Contact</h3>
        <p>
          For questions about these terms, please contact us using the contact information provided
          on the website.
        </p>
      </section>
    </div>
  );
}

/** Replace this body when you have final Privacy Policy copy. */
function PrivacyPlaceholderBody() {
  return (
    <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
      <p className="text-xs text-muted-foreground/90">
        <span className="font-medium text-foreground">Placeholder — </span>
        Replace this document with your final Privacy Policy.
      </p>
      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground">1. Overview</h3>
        <p>
          This Privacy Policy describes how MyDevTools collects, uses, and shares information when
          you use our website and related services. We are committed to protecting your privacy and
          handling data responsibly.
        </p>
      </section>
      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground">2. Information we collect</h3>
        <p>
          We may collect information you provide directly (for example, when you create an account
          or contact us), technical data such as device and browser type, and usage data related to
          how you interact with the service. Third-party sign-in providers may share basic profile
          information according to their own policies.
        </p>
      </section>
      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground">3. How we use information</h3>
        <p>
          We use collected information to operate and improve the service, provide support,
          communicate with you, enforce our terms, and comply with legal obligations. We do not sell
          your personal information as a matter of general practice; any exceptions will be
          described in an updated policy.
        </p>
      </section>
      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground">4. Data retention & security</h3>
        <p>
          We retain information only as long as needed for the purposes described in this policy or
          as required by law. We implement reasonable safeguards designed to protect your
          information, though no method of transmission over the Internet is completely secure.
        </p>
      </section>
      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground">5. Your choices</h3>
        <p>
          Depending on your location, you may have rights to access, correct, or delete certain
          personal information. Contact us to exercise those rights where applicable.
        </p>
      </section>
      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground">6. Updates</h3>
        <p>
          We may update this Privacy Policy from time to time. The &quot;last updated&quot; notice at
          the top will be revised when we post changes; your continued use of the service after
          updates constitutes acceptance of the revised policy.
        </p>
      </section>
    </div>
  );
}

type LegalAgreementFooterProps = {
  className?: string;
  linkClassName?: string;
};

export function LegalAgreementFooter({ className, linkClassName }: LegalAgreementFooterProps) {
  const [termsOpen, setTermsOpen] = React.useState(false);
  const [privacyOpen, setPrivacyOpen] = React.useState(false);

  const linkStyles = cn(
    "font-medium text-foreground/80 underline decoration-border underline-offset-4 transition-colors hover:text-foreground",
    linkClassName
  );

  return (
    <>
      <p className={cn("text-center leading-relaxed text-muted-foreground", className)}>
        By continuing, you agree to our{" "}
        <button type="button" onClick={() => setTermsOpen(true)} className={linkStyles}>
          Terms of Service
        </button>{" "}
        and{" "}
        <button type="button" onClick={() => setPrivacyOpen(true)} className={linkStyles}>
          Privacy Policy
        </button>
        .
      </p>

      <Dialog open={termsOpen} onOpenChange={setTermsOpen}>
        <DialogContent className="max-h-[min(85vh,640px)] gap-0 overflow-hidden p-0 sm:max-w-lg">
          <DialogHeader className="border-b border-border px-6 pb-4 pt-6 text-left">
            <DialogTitle>Terms of Service</DialogTitle>
            <DialogDescription className="text-left">
              General placeholder terms. Replace with your final legal text when ready.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[min(60vh,480px)] overflow-y-auto px-6 py-5">
            <TermsPlaceholderBody />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={privacyOpen} onOpenChange={setPrivacyOpen}>
        <DialogContent className="max-h-[min(85vh,640px)] gap-0 overflow-hidden p-0 sm:max-w-lg">
          <DialogHeader className="border-b border-border px-6 pb-4 pt-6 text-left">
            <DialogTitle>Privacy Policy</DialogTitle>
            <DialogDescription className="text-left">
              General placeholder policy. Replace with your final legal text when ready.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[min(60vh,480px)] overflow-y-auto px-6 py-5">
            <PrivacyPlaceholderBody />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
