'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Check } from 'lucide-react'

type Billing = 'monthly' | 'annual'

type Tier = {
  name: string
  tagline: string
  monthly: number | null // null = custom / contact
  annual: number | null // total per year (per seat for Team); 0 = free
  perSeat?: boolean
  cta: { href: string; label: string; external?: boolean }
  features: string[]
  highlight?: boolean
}

// ponytail: prices live here, single source. Mirrors HANDOFF "Business decisions".
const TIERS: Tier[] = [
  {
    name: 'Free',
    tagline: 'Self-host, or try the cloud with capped usage.',
    monthly: 0,
    annual: 0,
    cta: { href: '/login', label: 'Start free' },
    features: [
      'Self-host the full open-source toolkit',
      'Capped cloud usage, no card required',
      'All core developer tools',
      'Community support',
    ],
  },
  {
    name: 'Pro',
    tagline: 'For individual developers who live in the cloud.',
    monthly: 9,
    annual: 84,
    highlight: true,
    cta: { href: '/login', label: 'Start Pro' },
    features: [
      'Unlimited cloud usage',
      'Cross-device sync',
      'Private history & saved snippets',
      'Priority support',
    ],
  },
  {
    name: 'Team',
    tagline: 'Shared workspaces for small teams.',
    monthly: 15,
    annual: 144,
    perSeat: true,
    cta: { href: '/login', label: 'Start Team' },
    features: [
      'Everything in Pro, per seat',
      'Shared team workspace',
      'Roles & access controls',
      'Centralized billing',
    ],
  },
  {
    name: 'Enterprise',
    tagline: 'Compliance, SSO, and support at scale.',
    monthly: null,
    annual: null,
    cta: { href: 'mailto:support@mydevtools.tech', label: 'Contact sales', external: true },
    features: [
      'SSO / SAML & audit logs',
      'Self-host with a support SLA',
      'Security review & DPA',
      'Dedicated onboarding',
    ],
  },
]

function priceLabel(tier: Tier, billing: Billing): { big: string; sub: string } {
  if (tier.monthly === null) return { big: 'Custom', sub: "Let's scope it together" }
  if (tier.monthly === 0) return { big: '$0', sub: 'Free forever' }

  const seat = tier.perSeat ? '/user' : ''
  if (billing === 'monthly') {
    return { big: `$${tier.monthly}`, sub: `per month${seat}` }
  }
  // annual: show effective monthly, note the yearly total
  const perMonth = Math.round((tier.annual as number) / 12)
  return {
    big: `$${perMonth}`,
    sub: `per month${seat}, billed $${tier.annual}/yr`,
  }
}

export function PricingTiers() {
  const [billing, setBilling] = useState<Billing>('monthly')

  return (
    <section aria-labelledby="pricing-tiers-heading" className="py-14 md:py-20">
      <div className="container mx-auto max-w-6xl px-4 md:px-6">
        <div className="mb-10 flex flex-col items-center gap-5 text-center">
          <h2 id="pricing-tiers-heading" className="text-3xl font-bold md:text-4xl">
            Simple, honest <span className="mdt-grad-text">pricing</span>
          </h2>
          <p className="max-w-2xl text-muted-foreground">
            Self-host for free, forever. Upgrade to cloud when you want the convenience.
          </p>

          <div
            role="radiogroup"
            aria-label="Billing period"
            className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/60 p-1"
          >
            {(['monthly', 'annual'] as const).map((option) => (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={billing === option}
                onClick={() => setBilling(option)}
                className={
                  billing === option
                    ? 'mdt-btn-grad rounded-full px-5 py-2 text-sm font-medium capitalize'
                    : 'rounded-full px-5 py-2 text-sm font-medium capitalize text-muted-foreground transition-colors hover:text-foreground'
                }
              >
                {option}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            {billing === 'annual' ? (
              <span className="mdt-pill">Annual saves ~2 months</span>
            ) : (
              'Switch to annual for ~2 months free.'
            )}
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {TIERS.map((tier) => {
            const { big, sub } = priceLabel(tier, billing)
            return (
              <article
                key={tier.name}
                className={`glass-overlay mdt-card-hover relative flex flex-col overflow-hidden p-6 ${
                  tier.highlight
                    ? 'z-10 ring-2 ring-violet-400/60 shadow-2xl shadow-violet-500/25 lg:-translate-y-3 lg:scale-[1.04]'
                    : 'lg:mt-3'
                }`}
              >
                {tier.highlight ? (
                  <>
                    <div className="mdt-rail absolute inset-x-0 top-0 h-[3px]" />
                    <span className="mdt-pill absolute right-4 top-4">Most popular</span>
                  </>
                ) : null}

                <h3 className="text-lg font-semibold">{tier.name}</h3>
                <p className="mt-1 min-h-[2.5rem] text-sm leading-relaxed text-muted-foreground">
                  {tier.tagline}
                </p>

                <div className="mt-5 mb-6">
                  <div className="text-4xl font-bold tracking-tight">{big}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{sub}</div>
                </div>

                <Link
                  href={tier.cta.href}
                  target={tier.cta.external ? '_blank' : undefined}
                  rel={tier.cta.external ? 'noreferrer' : undefined}
                  className={
                    tier.highlight
                      ? 'mdt-btn-grad inline-flex h-11 items-center justify-center rounded-full px-5 text-sm font-medium'
                      : 'inline-flex h-11 items-center justify-center rounded-full border border-border/60 bg-background/60 px-5 text-sm font-medium text-foreground transition-all hover:bg-muted hover:scale-[1.02] active:scale-[0.98]'
                  }
                >
                  {tier.cta.label}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>

                <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex gap-2">
                      <Check className="mdt-icon-grad mt-0.5 h-4 w-4 shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
