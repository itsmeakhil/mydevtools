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

const LAST_UPDATED = "July 22, 2026";

function TermsBody() {
  return (
    <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
      <p className="text-xs text-muted-foreground/80">Last updated: {LAST_UPDATED}</p>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground">1. Agreement</h3>
        <p>
          By accessing or using MyDevTools (the &quot;Service&quot;), you agree to these Terms of
          Service and our Privacy Policy. If you do not agree, do not use the Service.
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground">2. Your account</h3>
        <p>
          You sign in with a supported provider, and we associate your account with your name and
          email address. You are responsible for keeping your account and sign-in credentials
          secure and for all activity under your account.
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground">3. Your data and encryption</h3>
        <p>
          The Service is local-first: the content you create with the tools is stored on your
          device and is not sent to us. Sensitive data such as vault records is encrypted on your
          device with a vault password that only you know. We never receive your vault password and
          cannot decrypt or recover your vault data.
        </p>
        <p className="font-medium text-foreground">
          If you lose your vault password, your encrypted data cannot be recovered by anyone,
          including us. Keeping a backup of your vault password is your responsibility.
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground">4. Acceptable use</h3>
        <p>
          You agree to use the Service lawfully and not to infringe others&apos; rights, disrupt the
          Service, or attempt to access accounts or data that are not yours. We may suspend or
          terminate access for conduct that we reasonably believe violates these terms.
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground">5. Availability &amp; disclaimer</h3>
        <p>
          The Service is provided &quot;as is&quot; without warranties of any kind. We do not
          guarantee uninterrupted or error-free operation. To the maximum extent permitted by law,
          we are not liable for any indirect or consequential damages, or for loss of data resulting
          from a lost vault password or from data stored only on your device.
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground">6. Changes</h3>
        <p>
          We may update these terms from time to time. Continued use after changes take effect
          constitutes acceptance of the revised terms.
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground">7. Contact</h3>
        <p>For questions about these terms, contact us using the details provided on the website.</p>
      </section>
    </div>
  );
}

function PrivacyBody() {
  return (
    <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
      <p className="text-xs text-muted-foreground/80">Last updated: {LAST_UPDATED}</p>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground">1. Our approach</h3>
        <p>
          MyDevTools is built to be private by design. The only personal information we hold on our
          servers is your account details. Everything you create with the tools stays on
          your device — it is not sent to us. Sensitive vault data is additionally encrypted on your
          device so that only you can read it.
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground">2. Information we store</h3>
        <p>We store only the minimum needed to run your account:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Your name and email address, from the sign-in provider you use.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground">3. Your tool data stays local</h3>
        <p>
          The content you create with the tools (notes, snippets, requests, keys, and other tool
          data) is saved locally on your device. It is not sent to us and is not part of your
          account.
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground">4. Local encrypted vault (zero-knowledge)</h3>
        <p>
          Sensitive data such as vault records is encrypted on your device with a vault password
          that only you know, and stays on your device. We never receive your vault password and
          have no way to decrypt or view your data — only you can, with your vault password.
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground">5. What we do not do</h3>
        <p>
          We do not read your tool data, we do not sell your personal information, and we do not use
          your content for advertising. If you lose your vault password, we cannot recover your
          encrypted data — that is the trade-off of true client-side encryption.
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground">6. How we use what we store</h3>
        <p>
          We use your account information to provide the Service, provide support, communicate
          service-related messages, and comply with legal obligations.
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground">7. Retention &amp; deletion</h3>
        <p>
          We keep account data for as long as your account is active or as required by
          law. When you delete your account, we delete your account data; data stored on your device
          is removed when you delete it locally.
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground">8. Your rights</h3>
        <p>
          Depending on your location, you may have rights to access, correct, export, or delete your
          personal information. Contact us to exercise these rights.
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground">9. Updates</h3>
        <p>
          We may update this Privacy Policy from time to time. The &quot;last updated&quot; date above
          reflects the latest version; continued use after changes constitutes acceptance.
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
              How you may use MyDevTools, and how your data and vault password are handled.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[min(60vh,480px)] overflow-y-auto px-6 py-5">
            <TermsBody />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={privacyOpen} onOpenChange={setPrivacyOpen}>
        <DialogContent className="max-h-[min(85vh,640px)] gap-0 overflow-hidden p-0 sm:max-w-lg">
          <DialogHeader className="border-b border-border px-6 pb-4 pt-6 text-left">
            <DialogTitle>Privacy Policy</DialogTitle>
            <DialogDescription className="text-left">
              What we store, what stays on your device, and how your local vault works.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[min(60vh,480px)] overflow-y-auto px-6 py-5">
            <PrivacyBody />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
