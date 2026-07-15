'use client'

import Link from 'next/link'
import { ArrowRight, Check } from 'lucide-react'

type Tier = {
  name: string
  tagline: string
  price: number // discounted, shown big
  was: number // real price, struck through
  period: string
  cta: { href: string; label: string }
  features: string[]
  highlight?: boolean
}

// ponytail: prices live here, single source. Mirrors HANDOFF "Pricing".
const TIERS: Tier[] = [
  {
    name: 'Yearly',
    tagline: 'Everything, billed once a year.',
    price: 59,
    was: 100,
    period: 'per year',
    cta: { href: '/login', label: 'Get Yearly' },
    features: [
      'Unlimited use of all developer tools',
      'Private history & saved snippets',
    ],
  },
  {
    name: 'Lifetime',
    tagline: 'Pay once. Yours forever.',
    price: 100,
    was: 300,
    period: 'one-time, pay once',
    highlight: true,
    cta: { href: '/login', label: 'Get Lifetime' },
    features: [
      'Everything in Yearly',
      'Never expires — pay once, yours for life',
      'Cross-device sync',
      'Priority support',
    ],
  },
]

export function PricingTiers() {
  return (
    <section aria-labelledby="pricing-tiers-heading" className="py-14 md:py-20">
      <div className="container mx-auto max-w-3xl px-4 md:px-6">
        <div className="mb-10 flex flex-col items-center gap-5 text-center">
          <h2 id="pricing-tiers-heading" className="text-3xl font-bold md:text-4xl">
            Simple, honest <span className="mdt-grad-text">pricing</span>
          </h2>
          <p className="max-w-2xl text-muted-foreground">
            Free while we&apos;re getting started. Lock in launch pricing before it goes up.
          </p>
          <p className="mdt-pill inline-flex items-center gap-1.5 text-sm">
            <span aria-hidden>🎉</span> Free for the first 250 users — after that, pick a plan below.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {TIERS.map((tier) => (
            <article
              key={tier.name}
              className={`glass-overlay mdt-card-hover relative flex flex-col overflow-hidden p-6 ${
                tier.highlight
                  ? 'z-10 ring-2 ring-violet-400/60 shadow-2xl shadow-violet-500/25'
                  : ''
              }`}
            >
              {tier.highlight ? (
                <>
                  <div className="mdt-rail absolute inset-x-0 top-0 h-[3px]" />
                  <span className="mdt-pill absolute right-4 top-4">Best value</span>
                </>
              ) : null}

              <h3 className="text-lg font-semibold">{tier.name}</h3>
              <p className="mt-1 min-h-[2.5rem] text-sm leading-relaxed text-muted-foreground">
                {tier.tagline}
              </p>

              <div className="mt-5 mb-6">
                <div className="flex items-baseline gap-2.5">
                  <span className="text-2xl font-semibold text-muted-foreground/70 line-through decoration-[1.5px]">
                    ${tier.was}
                  </span>
                  <span className="mdt-grad-text text-4xl font-bold tracking-tight">${tier.price}</span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">{tier.period}</div>
              </div>

              <Link
                href={tier.cta.href}
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
          ))}
        </div>
      </div>
    </section>
  )
}
