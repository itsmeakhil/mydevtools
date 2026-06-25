'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Link as LinkIcon,
  Globe,
  Twitter,
  Linkedin,
  Instagram,
  Youtube,
  Hash,
  AtSign,
  Github,
  Flame,
  Calendar,
  ChartBar,
  Code2,
  ArrowUpRight,
  Sparkles,
  Layers,
  MapPin,
  Briefcase,
  GraduationCap,
  FolderKanban,
  Award,
  Rss,
  FileDown,
  Terminal,
  Share2,
  Link2,
  ArrowUp,
  Check,
  ExternalLink,
  Loader2,
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import Link from 'next/link'
import { useTheme } from 'next-themes'
import { GitHubCalendar } from 'react-github-calendar'
import { toast } from 'sonner'
import { Logo } from '@/components/logo'
import { TECH_CATALOG } from '@/components/tech-stack-picker'
import { MdtStatusPage } from '@/components/mdt-status-page'
import { cn } from '@/lib/utils'

/* ──────────────────────────────────────────────────────────────────────── */
/*  Types                                                                  */
/* ──────────────────────────────────────────────────────────────────────── */

type PublicPersonalInfo = {
  headline?: string | null
  location?: string | null
  languages?: Array<{ name: string; level?: string }>
  hobbies?: string[]
}

type PublicProfile = {
  username: string
  display_name?: string | null
  photo_url?: string | null
  github_username?: string | null
  bio?: string | null
  social_links?: Record<string, string> | null
  tech_stacks?: string[] | null
  personal_info?: PublicPersonalInfo | null
  experiences?: Array<{
    id: string
    company: string
    role: string
    startDate: string
    endDate?: string | null
    description?: string | null
    technologies: string[]
    employmentType?: string | null
    location?: string | null
  }> | null
  projects?: Array<{
    id: string
    title: string
    description: string
    imageUrl?: string | null
    githubUrl?: string | null
    liveUrl?: string | null
    technologies: string[]
  }> | null
  education?: Array<{
    id: string
    institution: string
    degree: string
    startDate: string
    endDate?: string | null
    description?: string | null
  }> | null
  certifications?: Array<{
    id: string
    name: string
    issuer: string
    issueDate?: string | null
    expiryDate?: string | null
    credentialUrl?: string | null
  }> | null
  portfolio_settings?: {
    theme?: string | null
    font?: string | null
    accentColor?: string | null
    rssFeedUrl?: string | null
    showGithubStats?: boolean
    resumePdfUrl?: string | null
  } | null
}

type LayoutTheme = 'bento' | 'minimal' | 'terminal'

/* ──────────────────────────────────────────────────────────────────────── */
/*  Constants                                                              */
/* ──────────────────────────────────────────────────────────────────────── */

const SOCIAL_PLATFORMS: Record<
  string,
  {
    label: string
    icon: React.ComponentType<{ className?: string }>
    hoverColor: string
    bgAccent: string
  }
> = {
  website: {
    label: 'Website',
    icon: Globe,
    hoverColor: 'group-hover:text-blue-500',
    bgAccent: 'group-hover:bg-blue-500/10 group-hover:border-blue-500/40',
  },
  twitter: {
    label: 'Twitter / X',
    icon: Twitter,
    hoverColor: 'group-hover:text-sky-500',
    bgAccent: 'group-hover:bg-sky-500/10 group-hover:border-sky-500/40',
  },
  linkedin: {
    label: 'LinkedIn',
    icon: Linkedin,
    hoverColor: 'group-hover:text-blue-600',
    bgAccent: 'group-hover:bg-blue-600/10 group-hover:border-blue-600/40',
  },
  instagram: {
    label: 'Instagram',
    icon: Instagram,
    hoverColor: 'group-hover:text-pink-500',
    bgAccent: 'group-hover:bg-pink-500/10 group-hover:border-pink-500/40',
  },
  youtube: {
    label: 'YouTube',
    icon: Youtube,
    hoverColor: 'group-hover:text-red-500',
    bgAccent: 'group-hover:bg-red-500/10 group-hover:border-red-500/40',
  },
  devto: {
    label: 'Dev.to',
    icon: LinkIcon,
    hoverColor: 'group-hover:text-foreground',
    bgAccent: 'group-hover:bg-foreground/10 group-hover:border-foreground/30',
  },
  hashnode: {
    label: 'Hashnode',
    icon: Hash,
    hoverColor: 'group-hover:text-blue-500',
    bgAccent: 'group-hover:bg-blue-500/10 group-hover:border-blue-500/40',
  },
}

/* ──────────────────────────────────────────────────────────────────────── */
/*  Helpers                                                                */
/* ──────────────────────────────────────────────────────────────────────── */

function safeDate(s?: string | null) {
  if (!s) return null
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d
}

function formatPeriod(start: string, end?: string | null) {
  const fmt = (d: Date) => d.toLocaleDateString(undefined, { year: 'numeric', month: 'short' })
  const startDate = safeDate(start)
  const endDate = safeDate(end)
  const left = startDate ? fmt(startDate) : start
  const right = end?.trim() ? (endDate ? fmt(endDate) : end) : 'Present'
  return `${left} — ${right}`
}

function formatSingleDate(s: string) {
  const d = safeDate(s)
  return d ? d.toLocaleDateString(undefined, { year: 'numeric', month: 'short' }) : s
}

function durationBetween(start: string, end?: string | null): string | null {
  const s = safeDate(start)
  const e = end?.trim() ? safeDate(end) : new Date()
  if (!s || !e) return null
  let months = (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth())
  if (months < 0) return null
  if (months === 0) return '<1 mo'
  const years = Math.floor(months / 12)
  const remMonths = months % 12
  if (years === 0) return `${remMonths} mo`
  if (remMonths === 0) return `${years} yr${years > 1 ? 's' : ''}`
  return `${years} yr${years > 1 ? 's' : ''} ${remMonths} mo`
}

/* ──────────────────────────────────────────────────────────────────────── */
/*  Animated skeleton                                                      */
/* ──────────────────────────────────────────────────────────────────────── */

function ProfileSkeleton() {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex flex-col">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120%] h-[60%] bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.05),transparent_60%)] blur-3xl animate-pulse" />
      </div>
      <header className="w-full border-b border-border/30 bg-background/60 backdrop-blur-xl h-14" />
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <div className="flex flex-col lg:flex-row gap-12 items-center lg:items-start animate-pulse">
          <div className="h-36 w-36 md:h-44 md:w-44 rounded-full bg-muted/60 shrink-0" />
          <div className="flex-1 w-full space-y-4">
            <div className="h-3 w-20 rounded bg-muted/40" />
            <div className="h-10 w-2/3 rounded-lg bg-muted/60" />
            <div className="h-5 w-32 rounded-md bg-muted/40" />
            <div className="h-4 w-3/4 rounded bg-muted/30" />
            <div className="flex gap-2 pt-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-9 w-24 rounded-full bg-muted/40" />
              ))}
            </div>
          </div>
        </div>
        <div className="w-full mt-16 grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="h-56 rounded-2xl bg-muted/30 animate-pulse" />
          <div className="h-56 rounded-2xl bg-muted/30 animate-pulse" />
        </div>
      </main>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────────────── */
/*  Stagger animation wrapper                                              */
/* ──────────────────────────────────────────────────────────────────────── */

function StaggerChild({
  children,
  staggerIndex,
  className = '',
}: {
  children: React.ReactNode
  staggerIndex: number
  className?: string
}) {
  return (
    <div
      className={cn('opacity-0 motion-reduce:opacity-100 motion-reduce:translate-y-0', className)}
      style={{
        animation: `portfolioFadeUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards`,
        animationDelay: `${staggerIndex * 70}ms`,
      }}
    >
      {children}
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────────────── */
/*  Section heading                                                        */
/* ──────────────────────────────────────────────────────────────────────── */

function SectionHeading({
  icon: Icon,
  title,
  subtitle,
  variant,
  count,
  index,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  subtitle?: string
  variant: LayoutTheme
  count?: number
  index?: number
}) {
  return (
    <div className={cn('flex items-start gap-4 mb-8', variant === 'minimal' && 'mb-10')}>
      <div className="flex flex-col items-center gap-1.5 shrink-0">
        <div
          className={cn(
            'flex items-center justify-center shrink-0 rounded-xl border bg-background/80',
            variant === 'terminal'
              ? 'w-9 h-9 border-[color:var(--portfolio-accent)]/35 text-[color:var(--portfolio-accent)]'
              : 'w-10 h-10 border-border/50 text-[color:var(--portfolio-accent)] shadow-[0_0_16px_-4px_color-mix(in_srgb,var(--portfolio-accent)_40%,transparent)]',
            variant === 'minimal' && 'border-0 bg-transparent w-8 h-8 shadow-none',
          )}
        >
          <Icon className={cn('h-4 w-4', variant === 'minimal' && 'h-5 w-5')} />
        </div>
        {typeof index === 'number' && variant !== 'minimal' ? (
          <span className="text-[9px] font-bold tabular-nums tracking-widest text-muted-foreground/40">
            {String(index).padStart(2, '0')}
          </span>
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        {variant === 'minimal' ? (
          <div className="flex items-center gap-3 mb-1">
            <div className="h-px flex-1 bg-gradient-to-r from-[color:var(--portfolio-accent)]/40 to-transparent" />
          </div>
        ) : null}
        <div className="flex items-baseline gap-2.5 flex-wrap">
          {variant === 'terminal' ? (
            <span className="text-[color:var(--portfolio-accent)] font-mono text-sm select-none mr-0.5">
              {'>'}_
            </span>
          ) : null}
          <h2
            className={cn(
              'font-semibold tracking-tight text-foreground',
              variant === 'minimal' ? 'text-2xl md:text-3xl font-light' : 'text-xl md:text-2xl',
              variant === 'terminal' && 'font-mono',
            )}
          >
            {title}
          </h2>
          {typeof count === 'number' && count > 0 ? (
            <span
              className="text-[11px] font-semibold tabular-nums px-1.5 py-0.5 rounded-md"
              style={{
                color: 'var(--portfolio-accent)',
                background: 'color-mix(in srgb, var(--portfolio-accent) 10%, transparent)',
              }}
            >
              {count}
            </span>
          ) : null}
        </div>
        {subtitle ? (
          <p className="text-sm text-muted-foreground mt-1 max-w-xl leading-relaxed">{subtitle}</p>
        ) : null}
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────────────── */
/*  Tech chip                                                              */
/* ──────────────────────────────────────────────────────────────────────── */

function TechChip({ tech, subtle, large }: { tech: string; subtle?: boolean; large?: boolean }) {
  const meta = TECH_CATALOG.find((t) => t.name === tech)
  const src = meta ? (meta.iconUrl ?? `https://cdn.simpleicons.org/${meta.slug}/${meta.color}`) : null
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md font-medium border transition-all duration-200',
        large ? 'px-3 py-1.5 text-sm' : 'px-2.5 py-1 text-xs',
        subtle
          ? 'border-border/40 bg-muted/20 text-foreground/80 hover:border-[color:var(--portfolio-accent)]/30 hover:bg-muted/40'
          : 'border-border/50 bg-muted/35 text-foreground/85 hover:border-[color:var(--portfolio-accent)]/40 hover:bg-muted/55 hover:-translate-y-px hover:shadow-sm',
      )}
    >
      {src ? (
        <img
          src={src}
          alt=""
          width={large ? 14 : 12}
          height={large ? 14 : 12}
          className={cn('object-contain shrink-0', large ? 'w-3.5 h-3.5' : 'w-3 h-3')}
          loading="lazy"
        />
      ) : null}
      {tech}
    </span>
  )
}

/* ──────────────────────────────────────────────────────────────────────── */
/*  Project image placeholder                                              */
/* ──────────────────────────────────────────────────────────────────────── */

function projectPreviewTarget(liveUrl?: string | null, githubUrl?: string | null): string | null {
  const l = liveUrl?.trim()
  const g = githubUrl?.trim()
  const raw = l || g
  if (!raw) return null
  return raw.startsWith('http://') || raw.startsWith('https://') ? raw : `https://${raw}`
}

function faviconForPageUrl(pageUrl: string): string | null {
  try {
    const u = pageUrl.startsWith('http') ? pageUrl : `https://${pageUrl}`
    const host = new URL(u).hostname
    if (!host) return null
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=128`
  } catch {
    return null
  }
}

/** Direct screenshot-style preview from a page URL (live site or GitHub repo). */
function linkPreviewScreenshotUrl(pageUrl: string): string {
  return `https://image.thum.io/get/width/320/crop/180/noanimate/${encodeURIComponent(pageUrl)}`
}

function ProjectImagePlaceholder({ title, compact }: { title: string; compact?: boolean }) {
  const initials = (title || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
  return (
    <div
      className={cn(
        'relative w-full h-full min-h-[4.5rem] overflow-hidden flex items-center justify-center',
        !compact && 'aspect-[16/9] min-h-0 border-b border-border/30',
      )}
      style={{
        background: `radial-gradient(120% 120% at 0% 0%, color-mix(in srgb, var(--portfolio-accent) 28%, transparent), transparent 60%), radial-gradient(120% 120% at 100% 100%, color-mix(in srgb, var(--portfolio-accent) 16%, transparent), transparent 55%), hsl(var(--muted) / 0.4)`,
      }}
    >
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            'linear-gradient(currentColor 1px, transparent 1px), linear-gradient(to right, currentColor 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />
      <span
        className={cn(
          'relative font-bold tracking-tight',
          compact ? 'text-sm sm:text-base' : 'text-3xl md:text-4xl',
        )}
        style={{ color: 'var(--portfolio-accent)' }}
      >
        {initials}
      </span>
    </div>
  )
}

function TerminalTitlebar({ label }: { label: string }) {
  return (
    <div
      className="flex items-center gap-1.5 px-3 py-2 border-b"
      style={{
        borderColor: 'color-mix(in srgb, var(--portfolio-accent) 20%, transparent)',
        background: 'color-mix(in srgb, var(--portfolio-accent) 6%, transparent)',
      }}
    >
      <span className="w-2 h-2 rounded-full bg-red-400/70 shrink-0" />
      <span className="w-2 h-2 rounded-full bg-yellow-400/70 shrink-0" />
      <span className="w-2 h-2 rounded-full bg-green-400/70 shrink-0" />
      <span className="ml-1.5 text-[10px] font-mono text-muted-foreground/55 select-none">
        {label}
      </span>
    </div>
  )
}

function ProjectThumbnail({
  title,
  imageUrl,
  liveUrl,
  githubUrl,
}: {
  title: string
  imageUrl?: string | null
  liveUrl?: string | null
  githubUrl?: string | null
}) {
  const uploaded = imageUrl?.trim() ?? ''
  const targetUrl = useMemo(
    () => (uploaded ? null : projectPreviewTarget(liveUrl, githubUrl)),
    [uploaded, liveUrl, githubUrl],
  )
  const [remoteSrc, setRemoteSrc] = useState<string | null>(() =>
    targetUrl ? linkPreviewScreenshotUrl(targetUrl) : null,
  )
  const [imgReady, setImgReady] = useState(!!uploaded)
  const imgFailRef = useRef(0)
  const remoteRef = useRef<string | null>(null)
  remoteRef.current = remoteSrc

  useEffect(() => {
    imgFailRef.current = 0
    setImgReady(!!uploaded)
    if (uploaded) {
      setRemoteSrc(null)
      return
    }
    if (targetUrl) {
      setRemoteSrc(linkPreviewScreenshotUrl(targetUrl))
    } else {
      setRemoteSrc(null)
    }
  }, [uploaded, targetUrl])

  const displaySrc = uploaded || remoteSrc

  if (!displaySrc) {
    return <ProjectImagePlaceholder title={title} compact />
  }

  return (
    <>
      {!imgReady && !uploaded ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-muted/40">
          <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" aria-hidden />
        </div>
      ) : null}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={displaySrc}
        alt={`${title} preview`}
        title={title}
        referrerPolicy="no-referrer"
        className={cn(
          'absolute inset-0 h-full w-full object-cover transition-all duration-300 group-hover:scale-[1.04]',
          !imgReady && 'opacity-0',
        )}
        loading="lazy"
        onLoad={() => setImgReady(true)}
        onError={() => {
          if (uploaded) return
          const fav = targetUrl ? faviconForPageUrl(targetUrl) : null
          if (imgFailRef.current === 0 && fav && fav !== remoteRef.current) {
            imgFailRef.current = 1
            setImgReady(false)
            setRemoteSrc(fav)
            return
          }
          setRemoteSrc(null)
          setImgReady(true)
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/45 via-transparent to-transparent opacity-60" />
    </>
  )
}

/* ──────────────────────────────────────────────────────────────────────── */
/*  Hooks                                                                  */
/* ──────────────────────────────────────────────────────────────────────── */

function useScrollProgress() {
  const [progress, setProgress] = useState(0)
  const [showTop, setShowTop] = useState(false)
  const prevRef = useRef({ p: 0, top: false })
  useEffect(() => {
    let raf = 0
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const h = document.documentElement
        const max = h.scrollHeight - h.clientHeight
        const p = max > 0 ? Math.round((h.scrollTop / max) * 1000) / 10 : 0
        const top = h.scrollTop > 600
        if (p !== prevRef.current.p) {
          prevRef.current.p = p
          setProgress(p)
        }
        if (top !== prevRef.current.top) {
          prevRef.current.top = top
          setShowTop(top)
        }
      })
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
    }
  }, [])
  return { progress, showTop }
}

function useScrollSpy(sectionIds: string[], offset = 96) {
  const [active, setActive] = useState<string | null>(null)
  const idsRef = useRef(sectionIds)
  idsRef.current = sectionIds
  const activeRef = useRef(active)
  activeRef.current = active

  useEffect(() => {
    let raf = 0
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const ids = idsRef.current
        if (ids.length === 0) return
        let current: string | null = null
        for (const id of ids) {
          const el = document.getElementById(id)
          if (!el) continue
          if (el.getBoundingClientRect().top - offset <= 0) current = id
        }
        const next = current ?? ids[0]
        if (next !== activeRef.current) setActive(next)
      })
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
    }
  }, [offset])
  return active
}

/* ──────────────────────────────────────────────────────────────────────── */
/*  Main component                                                         */
/* ──────────────────────────────────────────────────────────────────────── */

export default function PublicProfileClient({ username: usernameParam }: { username: string }) {
  const { theme } = useTheme()
  const [profile, setProfile] = useState<PublicProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [copied, setCopied] = useState(false)
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const usernameSegment = useMemo(() => usernameParam.trim(), [usernameParam])

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!usernameSegment) {
      setProfile(null)
      setError(true)
      setLoading(false)
      return
    }

    let cancelled = false
    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => controller.abort(), 25_000)

    const slug = encodeURIComponent(usernameSegment)

    ;(async () => {
      setLoading(true)
      setError(false)
      try {
        const res = await fetch(`/api/backend/users/${slug}`, {
          signal: controller.signal,
          cache: 'no-store',
        })
        if (cancelled) return
        if (res.ok) {
          const data = (await res.json()) as PublicProfile
          setProfile(data)
          setError(false)
        } else {
          setProfile(null)
          setError(true)
        }
      } catch {
        if (!cancelled) {
          setProfile(null)
          setError(true)
        }
      } finally {
        window.clearTimeout(timeoutId)
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
      controller.abort()
      window.clearTimeout(timeoutId)
    }
  }, [usernameSegment])

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
    }
  }, [])

  const settings = profile?.portfolio_settings
  const accent = settings?.accentColor?.trim() || '#3b82f6'
  const layoutTheme: LayoutTheme =
    settings?.theme === 'minimal' || settings?.theme === 'terminal' ? settings.theme : 'bento'
  const fontKey = settings?.font === 'serif' || settings?.font === 'mono' ? settings.font : 'sans'
  const showGithub = !!profile?.github_username?.trim() && settings?.showGithubStats !== false

  const fontClass =
    fontKey === 'serif' ? 'font-serif' : fontKey === 'mono' ? 'font-mono' : 'font-sans'

  // Terminal theme forces monospace regardless of user font preference
  const effectiveFontClass = layoutTheme === 'terminal' ? 'font-mono' : fontClass

  const cardClass = useMemo(() => {
    if (layoutTheme === 'minimal')
      return 'border-l-2 border-[color:var(--portfolio-accent)]/30 bg-transparent shadow-none pl-5 py-2'
    if (layoutTheme === 'terminal')
      return 'rounded-md border border-[color:var(--portfolio-accent)]/30 bg-card/50 backdrop-blur-sm overflow-hidden transition-colors hover:border-[color:var(--portfolio-accent)]/50'
    return 'portfolio-card-glow relative rounded-2xl border border-border/40 bg-card/40 backdrop-blur-md shadow-[0_1px_0_0_hsl(var(--background)/0.4)_inset,0_8px_24px_-12px_hsl(var(--foreground)/0.08)] hover:border-border/50 hover:shadow-[0_1px_0_0_hsl(var(--background)/0.4)_inset,0_20px_60px_-12px_hsl(var(--foreground)/0.14),0_0_0_1px_color-mix(in_srgb,var(--portfolio-accent)_8%,transparent)] transition-all duration-300'
  }, [layoutTheme])

  const { progress, showTop } = useScrollProgress()

  const isDark = theme === 'dark'
  const hasSocials = !!profile?.social_links &&
    Object.entries(profile.social_links).some(
      ([k, val]) => k !== 'github' && typeof val === 'string' && val.trim() !== '',
    )
  const socialGithubUrl = profile?.social_links?.github?.trim()
  const hasGithubUsername = !!profile?.github_username?.trim()
  const hasGithub = hasGithubUsername || !!socialGithubUrl
  const displayName = profile?.display_name || profile?.username || ''
  const initials = displayName?.charAt(0)?.toUpperCase() || '?'
  const pi = profile?.personal_info
  const experiences = profile?.experiences ?? []
  const projects = profile?.projects ?? []
  const education = profile?.education ?? []
  const certifications = profile?.certifications ?? []
  const techStacks = profile?.tech_stacks ?? []

  const navItems = useMemo(
    () =>
      [
        experiences.length ? { id: 'experience', label: 'Experience' } : null,
        projects.length ? { id: 'projects', label: 'Projects' } : null,
        education.length ? { id: 'education', label: 'Education' } : null,
        certifications.length ? { id: 'certifications', label: 'Certifications' } : null,
        techStacks.length ? { id: 'stack', label: 'Stack' } : null,
        showGithub ? { id: 'github', label: 'GitHub' } : null,
      ].filter(Boolean) as { id: string; label: string }[],
    [
      experiences.length,
      projects.length,
      education.length,
      certifications.length,
      techStacks.length,
      showGithub,
    ],
  )
  const sectionIds = useMemo(() => navItems.map((n) => n.id), [navItems])
  const activeId = useScrollSpy(sectionIds)

  const handleCopyLink = useCallback(async () => {
    if (typeof window === 'undefined') return
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      toast.success('Link copied to clipboard')
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
      copyTimerRef.current = setTimeout(() => setCopied(false), 1800)
    } catch {
      toast.error('Could not copy link')
    }
  }, [])

  const handleShare = useCallback(async () => {
    if (typeof window === 'undefined') return
    const data = {
      title: displayName ? `${displayName} — Portfolio` : 'Developer portfolio',
      text: pi?.headline || profile?.bio || `Check out ${displayName}'s portfolio`,
      url: window.location.href,
    }
    if (typeof navigator !== 'undefined' && (navigator as Navigator).share) {
      try {
        await (navigator as Navigator).share(data)
      } catch {
        /* user dismissed */
      }
    } else {
      handleCopyLink()
    }
  }, [displayName, pi?.headline, profile?.bio, handleCopyLink])

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' })

  if (!mounted || loading) return <ProfileSkeleton />

  if (error || !profile) {
    return (
      <MdtStatusPage
        code="404"
        kicker="Profile not found"
        title="This profile doesn't exist yet."
        description={`@${usernameSegment} hasn't been claimed. Grab the handle and create your own developer profile for free.`}
        diagnostics={[
          'looking up developer profile…',
          `GET /@${usernameSegment} → 404 NOT_CLAIMED`,
          'hint: this handle is available',
        ]}
      >
        <Link
          href="/login"
          className="mdt-btn-grad inline-flex h-12 items-center justify-center rounded-full px-7 text-sm font-medium"
        >
          <Sparkles className="mr-2 h-4 w-4" />
          Create Profile
        </Link>
        <Link
          href="/tools"
          className="inline-flex h-12 items-center justify-center rounded-full border border-border/60 bg-background/60 px-7 text-sm font-medium text-foreground transition-all hover:bg-muted hover:scale-[1.03] active:scale-[0.98]"
        >
          Explore Tools
        </Link>
      </MdtStatusPage>
    )
  }

  return (
    <div
      className={cn(
        'min-h-screen relative isolate flex flex-col text-foreground',
        effectiveFontClass,
        layoutTheme === 'terminal' && 'selection:bg-[color:var(--portfolio-accent)]/25',
        layoutTheme === 'minimal' && 'tracking-tight',
      )}
      style={{ ['--portfolio-accent' as string]: accent } as React.CSSProperties}
    >
      <style jsx global>{`
        ${fontKey === 'mono' ? `@import url('https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600&display=swap');` : ''}
        ${fontKey === 'serif' ? `@import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;1,400&display=swap');` : ''}
        @keyframes portfolioFadeUp {
          from {
            opacity: 0;
            transform: translateY(18px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes portfolioPulseRing {
          0%, 100% {
            box-shadow: 0 0 0 0 color-mix(in srgb, var(--portfolio-accent) 35%, transparent);
          }
          50% {
            box-shadow: 0 0 0 12px color-mix(in srgb, var(--portfolio-accent) 0%, transparent);
          }
        }
        @keyframes portfolioSpinRing {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes portfolioShimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @media (prefers-reduced-motion: reduce) {
          .motion-reduce\\:opacity-100 { opacity: 1 !important; }
          .motion-reduce\\:translate-y-0 { transform: none !important; }
          [style*="portfolioFadeUp"], [style*="portfolioPulseRing"], [style*="portfolioSpinRing"] {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
        }
        .portfolio-no-scrollbar { scrollbar-width: none; -ms-overflow-style: none; }
        .portfolio-no-scrollbar::-webkit-scrollbar { display: none; }
        .portfolio-card-glow::after {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: inherit;
          padding: 1px;
          background: linear-gradient(135deg, color-mix(in srgb, var(--portfolio-accent) 40%, transparent), transparent 50%, color-mix(in srgb, var(--portfolio-accent) 15%, transparent));
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          opacity: 0;
          transition: opacity 0.3s ease;
          pointer-events: none;
        }
        .portfolio-card-glow:hover::after { opacity: 1; }
        @media print {
          .portfolio-print-hide { display: none !important; }
          .portfolio-print-card { box-shadow: none !important; border-color: #ddd !important; backdrop-filter: none !important; background: white !important; }
          body { background: white !important; }
        }
      `}</style>

      {/* Scroll progress bar */}
      <div className="portfolio-print-hide fixed top-0 left-0 right-0 h-[2px] z-[60] pointer-events-none">
        <div
          className="h-full origin-left transition-transform duration-150 ease-out"
          style={{
            width: '100%',
            transform: `scaleX(${progress / 100})`,
            background: `linear-gradient(90deg, var(--portfolio-accent), color-mix(in srgb, var(--portfolio-accent) 50%, transparent))`,
          }}
        />
      </div>

      {/* Ambient backdrop */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden portfolio-print-hide">
        <div
          className="absolute -top-[35%] left-1/2 -translate-x-1/2 w-[180%] h-[85%] blur-3xl opacity-70"
          style={{
            background: `radial-gradient(ellipse at 30% 20%, color-mix(in srgb, var(--portfolio-accent) 18%, transparent), transparent 55%), radial-gradient(ellipse at 70% 60%, hsl(var(--primary) / 0.06), transparent 50%)`,
          }}
        />
        <div
          className="absolute -bottom-[25%] -right-[15%] w-[65%] h-[55%] blur-3xl opacity-50"
          style={{
            background:
              layoutTheme === 'terminal'
                ? 'radial-gradient(ellipse at center, color-mix(in srgb, var(--portfolio-accent) 12%, transparent), transparent 55%)'
                : isDark
                  ? 'radial-gradient(ellipse at center, hsl(160 50% 35% / 0.05), transparent 50%)'
                  : 'radial-gradient(ellipse at center, hsl(220 80% 50% / 0.06), transparent 50%)',
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.025] dark:opacity-[0.04]"
          style={{
            backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />
        {/* Terminal scanlines */}
        {layoutTheme === 'terminal' ? (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.012) 3px, rgba(0,0,0,0.012) 4px)',
            }}
          />
        ) : null}
      </div>

      {/* Header */}
      <header className="portfolio-print-hide w-full border-b border-border/30 bg-background/75 backdrop-blur-xl sticky top-0 z-50">
        <div
          className={cn(
            'max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4',
            layoutTheme === 'minimal' && 'max-w-3xl',
          )}
        >
          <Link href="/" className="flex items-center gap-2 group shrink-0 cursor-pointer">
            <Logo size={26} showText className="group-hover:opacity-80 transition-opacity" />
          </Link>
          {navItems.length > 0 ? (
            <nav className="hidden md:flex items-center gap-1 text-xs font-medium">
              {navItems.map((item) => {
                const isActive = activeId === item.id
                return (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    className={cn(
                      'px-3 py-1.5 rounded-full transition-all duration-200 whitespace-nowrap cursor-pointer',
                      isActive
                        ? 'text-foreground bg-muted/70 shadow-sm'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/40',
                    )}
                  >
                    {item.label}
                  </a>
                )
              })}
            </nav>
          ) : null}
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-full border border-border/60 hover:border-border hover:bg-muted/40 shrink-0 cursor-pointer"
          >
            <span className="hidden sm:inline">Explore Tools</span>
            <span className="sm:hidden">Tools</span>
            <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
        {/* Mobile section nav */}
        {navItems.length > 0 ? (
          <nav className="md:hidden border-t border-border/20 bg-background/60 backdrop-blur-xl">
            <div className="max-w-6xl mx-auto px-3 py-2 flex items-center gap-1 overflow-x-auto portfolio-no-scrollbar">
              {navItems.map((item) => {
                const isActive = activeId === item.id
                return (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors cursor-pointer',
                      isActive
                        ? 'text-foreground bg-muted/70'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/40',
                    )}
                  >
                    {item.label}
                  </a>
                )
              })}
            </div>
          </nav>
        ) : null}
      </header>

      {/* Hero */}
      <section
        className={cn(
          'relative w-full border-b border-border/20',
          layoutTheme === 'minimal' ? 'py-20 md:py-28' : 'py-14 md:py-20',
        )}
      >
        <div
          className={cn(
            'max-w-6xl mx-auto px-4 sm:px-6 flex flex-col lg:flex-row gap-10 lg:gap-16 items-center lg:items-start',
            layoutTheme === 'minimal' && 'max-w-3xl flex-col items-center text-center',
          )}
        >
          <StaggerChild staggerIndex={0} className="shrink-0">
            <div className="relative">
              {/* Ambient glow behind avatar */}
              <div
                className="absolute -inset-4 rounded-full blur-3xl opacity-40 -z-10"
                style={{
                  background: `radial-gradient(circle, var(--portfolio-accent), transparent 70%)`,
                }}
              />
              {/* Spinning conic gradient ring */}
              <div
                className={cn(
                  'absolute -inset-1.5 rounded-full -z-10',
                  layoutTheme === 'minimal' ? '-inset-1' : '-inset-1.5',
                )}
                style={{
                  background: `conic-gradient(from 0deg, color-mix(in srgb, var(--portfolio-accent) 80%, transparent), transparent 40%, color-mix(in srgb, var(--portfolio-accent) 50%, transparent) 60%, transparent 80%, color-mix(in srgb, var(--portfolio-accent) 80%, transparent))`,
                  animation: 'portfolioSpinRing 4s linear infinite',
                  borderRadius: '50%',
                }}
              />
              <Avatar
                className={cn(
                  'border-[3px] border-background shadow-2xl',
                  layoutTheme === 'minimal' ? 'h-32 w-32 md:h-40 md:w-40' : 'h-36 w-36 md:h-48 md:w-48',
                )}
              >
                <AvatarImage src={profile.photo_url || undefined} alt={displayName} />
                <AvatarFallback
                  className="text-3xl md:text-5xl font-bold"
                  style={{
                    background: `linear-gradient(135deg, color-mix(in srgb, var(--portfolio-accent) 28%, transparent), color-mix(in srgb, var(--portfolio-accent) 10%, transparent))`,
                    color: 'var(--portfolio-accent)',
                  }}
                >
                  {initials}
                </AvatarFallback>
              </Avatar>
              {/* Online status dot */}
              <span
                className="absolute bottom-2.5 right-2.5 w-4 h-4 rounded-full border-[3px] border-background shadow-md"
                style={{
                  background: 'rgb(16 185 129)',
                  boxShadow: '0 0 8px 2px rgba(16,185,129,0.5)',
                }}
                aria-hidden
              />
            </div>
          </StaggerChild>

          <div className={cn('flex-1 min-w-0 space-y-5', layoutTheme === 'minimal' && 'items-center w-full')}>
            <StaggerChild staggerIndex={1}>
              <div className={cn('space-y-2', layoutTheme === 'minimal' && 'text-center')}>
                <div className={cn('flex items-center gap-2', layoutTheme === 'minimal' && 'justify-center')}>
                  <span
                    className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.25em] px-2.5 py-1 rounded-full border"
                    style={{
                      color: 'var(--portfolio-accent)',
                      borderColor: 'color-mix(in srgb, var(--portfolio-accent) 35%, transparent)',
                      background: 'color-mix(in srgb, var(--portfolio-accent) 8%, transparent)',
                    }}
                  >
                    <Sparkles className="h-2.5 w-2.5" />
                    Portfolio
                  </span>
                </div>
                <h1
                  className={cn(
                    'font-extrabold tracking-tight leading-[1.02] break-words',
                    layoutTheme === 'minimal'
                      ? 'text-5xl sm:text-6xl md:text-7xl font-light'
                      : 'text-4xl sm:text-5xl md:text-6xl',
                  )}
                  style={{
                    backgroundImage: `linear-gradient(135deg, hsl(var(--foreground)) 0%, hsl(var(--foreground)) 50%, color-mix(in srgb, var(--portfolio-accent) 90%, hsl(var(--foreground))) 80%, color-mix(in srgb, var(--portfolio-accent) 70%, transparent) 100%)`,
                    WebkitBackgroundClip: 'text',
                    backgroundClip: 'text',
                    color: 'transparent',
                    backgroundSize: '200% auto',
                  }}
                >
                  {displayName}
                </h1>
                <p
                  className={cn(
                    'text-muted-foreground flex items-center gap-1.5 font-medium text-sm',
                    layoutTheme === 'minimal' && 'justify-center',
                  )}
                >
                  <AtSign className="h-3.5 w-3.5 opacity-50" />
                  <span>{profile.username}</span>
                </p>
                {pi?.headline ? (
                  <p
                    className={cn(
                      'text-lg md:text-xl text-foreground/85 font-medium max-w-2xl leading-snug pt-1',
                      layoutTheme === 'minimal' && 'mx-auto',
                    )}
                  >
                    {pi.headline}
                  </p>
                ) : null}
                {pi?.location || (pi?.languages && pi.languages.length > 0) ? (
                  <div
                    className={cn(
                      'flex flex-wrap gap-2 pt-1.5',
                      layoutTheme === 'minimal' && 'justify-center',
                    )}
                  >
                    {pi?.location ? (
                      <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full border border-border/50 bg-muted/30 text-muted-foreground">
                        <MapPin className="h-3 w-3 text-[color:var(--portfolio-accent)]" />
                        {pi.location}
                      </span>
                    ) : null}
                    {pi?.languages?.map((lang) => (
                      <span
                        key={lang.name}
                        className="inline-flex items-center text-xs px-3 py-1 rounded-full border border-border/40 bg-background/60 text-muted-foreground"
                      >
                        {lang.name}
                        {lang.level ? <span className="opacity-60 ml-1">· {lang.level}</span> : null}
                      </span>
                    ))}
                  </div>
                ) : null}
                {profile.bio?.trim() ? (
                  <p className="text-base text-foreground/75 max-w-2xl leading-relaxed whitespace-pre-wrap pt-3">
                    {profile.bio}
                  </p>
                ) : null}
                {pi?.hobbies && pi.hobbies.length > 0 ? (
                  <div
                    className={cn(
                      'flex flex-wrap gap-1.5 pt-3',
                      layoutTheme === 'minimal' && 'justify-center',
                    )}
                  >
                    {pi.hobbies.map((h) => (
                      <span
                        key={h}
                        className="text-[11px] uppercase tracking-wider px-2 py-0.5 rounded border border-dashed border-border/60 text-muted-foreground"
                      >
                        {h}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            </StaggerChild>

            {/* Action buttons */}
            <StaggerChild staggerIndex={2}>
              <div
                className={cn(
                  'flex flex-wrap items-center gap-2 portfolio-print-hide',
                  layoutTheme === 'minimal' && 'justify-center',
                )}
              >
                {settings?.resumePdfUrl?.trim() ? (
                  <a
                    href={settings.resumePdfUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2.5 rounded-full text-white shadow-lg transition-all hover:opacity-90 hover:-translate-y-px cursor-pointer"
                    style={{
                      backgroundColor: 'var(--portfolio-accent)',
                      boxShadow: `0 8px 24px -8px var(--portfolio-accent)`,
                    }}
                  >
                    <FileDown className="h-4 w-4" />
                    Download résumé
                  </a>
                ) : null}
                {settings?.rssFeedUrl?.trim() ? (
                  <a
                    href={settings.rssFeedUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2.5 rounded-full border border-border/60 bg-background/60 hover:bg-muted/50 transition-colors cursor-pointer"
                  >
                    <Rss className="h-4 w-4 text-[color:var(--portfolio-accent)]" />
                    RSS
                  </a>
                ) : null}
                <button
                  type="button"
                  onClick={handleShare}
                  className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2.5 rounded-full border border-border/60 bg-background/60 hover:bg-muted/50 transition-colors cursor-pointer"
                  aria-label="Share this portfolio"
                >
                  <Share2 className="h-4 w-4" />
                  Share
                </button>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2.5 rounded-full border border-border/60 bg-background/60 hover:bg-muted/50 transition-colors cursor-pointer"
                  aria-label="Copy link"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 text-emerald-500" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Link2 className="h-4 w-4" />
                      Copy link
                    </>
                  )}
                </button>
              </div>
            </StaggerChild>

            {(hasSocials || hasGithub) && (
              <StaggerChild staggerIndex={3}>
                <div
                  className={cn(
                    'flex flex-wrap gap-2 portfolio-print-hide',
                    layoutTheme === 'minimal' && 'justify-center',
                  )}
                >
                  {Object.entries(SOCIAL_PLATFORMS).map(([key, platform]) => {
                    const url = profile.social_links?.[key]
                    if (!url?.trim()) return null
                    const Icon = platform.icon
                    const formattedUrl = url.startsWith('http') ? url : `https://${url}`
                    return (
                      <a
                        key={key}
                        href={formattedUrl}
                        target="_blank"
                        rel="noreferrer"
                        title={platform.label}
                        className={cn(
                          'group relative inline-flex items-center gap-2 px-3.5 py-2 rounded-full border border-border/50 bg-card/50 backdrop-blur-sm text-muted-foreground text-sm font-medium transition-all duration-300 hover:shadow-md hover:-translate-y-px cursor-pointer',
                          platform.bgAccent,
                        )}
                      >
                        <Icon className={cn('h-4 w-4 transition-colors', platform.hoverColor)} />
                        <span className={cn('transition-colors', platform.hoverColor)}>{platform.label}</span>
                      </a>
                    )
                  })}
                  {hasGithubUsername ? (
                    <a
                      href={`https://github.com/${profile.github_username}`}
                      target="_blank"
                      rel="noreferrer"
                      title="GitHub"
                      className="group relative inline-flex items-center gap-2 px-3.5 py-2 rounded-full border border-border/50 bg-card/50 backdrop-blur-sm text-muted-foreground text-sm font-medium transition-all duration-300 hover:shadow-md hover:-translate-y-px hover:bg-foreground/5 hover:border-foreground/30 cursor-pointer"
                    >
                      <Github className="h-4 w-4 transition-colors group-hover:text-foreground" />
                      <span className="transition-colors group-hover:text-foreground">GitHub</span>
                    </a>
                  ) : socialGithubUrl ? (
                    <a
                      href={socialGithubUrl.startsWith('http') ? socialGithubUrl : `https://${socialGithubUrl}`}
                      target="_blank"
                      rel="noreferrer"
                      className="group relative inline-flex items-center gap-2 px-3.5 py-2 rounded-full border border-border/50 bg-card/50 backdrop-blur-sm text-muted-foreground text-sm font-medium transition-all duration-300 hover:shadow-md hover:-translate-y-px hover:bg-foreground/5 hover:border-foreground/30 cursor-pointer"
                    >
                      <Github className="h-4 w-4 transition-colors group-hover:text-foreground" />
                      <span className="transition-colors group-hover:text-foreground">GitHub</span>
                    </a>
                  ) : null}
                </div>
              </StaggerChild>
            )}

            {/* Quick stats strip */}
            {(experiences.length > 0 || projects.length > 0 || techStacks.length > 0) && (
              <StaggerChild staggerIndex={4}>
                <div
                  className={cn(
                    'inline-flex flex-wrap items-center gap-0 pt-3 portfolio-print-hide overflow-hidden',
                    layoutTheme === 'minimal'
                      ? 'mx-auto gap-x-5 gap-y-1'
                      : 'rounded-2xl border border-border/30 bg-muted/20 backdrop-blur-sm',
                    layoutTheme === 'terminal' && 'rounded-md border border-[color:var(--portfolio-accent)]/25 bg-transparent',
                  )}
                >
                  {[
                    experiences.length > 0 ? { value: experiences.length, label: experiences.length > 1 ? 'roles' : 'role', icon: Briefcase } : null,
                    projects.length > 0 ? { value: projects.length, label: projects.length > 1 ? 'projects' : 'project', icon: FolderKanban } : null,
                    techStacks.length > 0 ? { value: techStacks.length, label: 'technologies', icon: Layers } : null,
                    certifications.length > 0 ? { value: certifications.length, label: certifications.length > 1 ? 'certs' : 'cert', icon: Award } : null,
                  ].filter(Boolean).map((stat, i, arr) => stat && (
                    <React.Fragment key={stat.label}>
                      <div className="flex items-center gap-2 px-4 py-2.5">
                        <stat.icon className="h-3.5 w-3.5 text-[color:var(--portfolio-accent)] opacity-70" />
                        <span className="text-lg font-bold tabular-nums text-foreground leading-none">{stat.value}</span>
                        <span className="text-xs text-muted-foreground leading-none">{stat.label}</span>
                      </div>
                      {i < arr.length - 1 ? (
                        <div className="w-px h-6 bg-border/50 shrink-0" />
                      ) : null}
                    </React.Fragment>
                  ))}
                </div>
              </StaggerChild>
            )}
          </div>
        </div>
      </section>

      {/* Main */}
      <main
        className={cn(
          'flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-14 md:py-20 space-y-16 md:space-y-24',
          layoutTheme === 'minimal' && 'max-w-3xl space-y-20',
        )}
      >
        {/* Experience — vertical timeline */}
        {experiences.length > 0 ? (
          <section id="experience" className="scroll-mt-28">
            <StaggerChild staggerIndex={0}>
              <SectionHeading
                icon={Briefcase}
                title="Experience"
                subtitle="Roles, impact, and the tools that shipped with them."
                variant={layoutTheme}
                count={experiences.length}
                index={1}
              />
            </StaggerChild>
            <ol className="relative space-y-6 md:pl-8 md:before:content-[''] md:before:absolute md:before:left-3 md:before:top-2 md:before:bottom-2 md:before:w-px md:before:bg-gradient-to-b md:before:from-[color:var(--portfolio-accent)]/40 md:before:via-border md:before:to-transparent">
              {experiences.map((exp, i) => {
                const duration = durationBetween(exp.startDate, exp.endDate)
                const isPresent = !exp.endDate?.trim()
                return (
                  <StaggerChild key={exp.id} staggerIndex={i + 1}>
                    <li className="relative">
                      {/* Timeline dot */}
                      <span
                        className="hidden md:block absolute -left-8 top-7 w-3 h-3 rounded-full border-2 border-background"
                        style={{
                          background: isPresent
                            ? 'var(--portfolio-accent)'
                            : 'color-mix(in srgb, var(--portfolio-accent) 50%, hsl(var(--muted)))',
                          boxShadow: isPresent
                            ? `0 0 0 4px color-mix(in srgb, var(--portfolio-accent) 18%, transparent)`
                            : 'none',
                        }}
                        aria-hidden
                      />
                      <article className={cn('portfolio-print-card overflow-hidden', cardClass, layoutTheme !== 'terminal' && 'p-6 md:p-7')}>
                        {layoutTheme === 'terminal' ? (
                          <TerminalTitlebar label={`${exp.company.toLowerCase().replace(/\s+/g, '-')}.sh`} />
                        ) : null}
                        <div className={cn(layoutTheme === 'terminal' && 'p-5 md:p-6')}>
                        {/* Top accent line */}
                        {isPresent && layoutTheme !== 'terminal' ? (
                          <div
                            className="absolute top-0 left-0 right-0 h-[2px]"
                            style={{ background: `linear-gradient(90deg, var(--portfolio-accent), color-mix(in srgb, var(--portfolio-accent) 20%, transparent))` }}
                          />
                        ) : null}
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="text-lg font-semibold text-foreground leading-tight">{exp.role}</h3>
                            <p className="text-[color:var(--portfolio-accent)] font-semibold mt-0.5">
                              {exp.company}
                            </p>
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground mt-2">
                              <span>{formatPeriod(exp.startDate, exp.endDate)}</span>
                              {duration ? (
                                <>
                                  <span aria-hidden className="opacity-40">·</span>
                                  <span className="tabular-nums">{duration}</span>
                                </>
                              ) : null}
                              {exp.employmentType ? (
                                <>
                                  <span aria-hidden className="opacity-40">·</span>
                                  <span>{exp.employmentType}</span>
                                </>
                              ) : null}
                              {exp.location ? (
                                <>
                                  <span aria-hidden className="opacity-40">·</span>
                                  <span className="inline-flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    {exp.location}
                                  </span>
                                </>
                              ) : null}
                            </div>
                          </div>
                          {isPresent ? (
                            <span
                              className="inline-flex items-center gap-1.5 self-start text-[10px] uppercase tracking-wider font-semibold px-2 py-1 rounded-full border"
                              style={{
                                color: 'var(--portfolio-accent)',
                                borderColor: 'color-mix(in srgb, var(--portfolio-accent) 40%, transparent)',
                                background: 'color-mix(in srgb, var(--portfolio-accent) 10%, transparent)',
                              }}
                            >
                              <span
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ background: 'var(--portfolio-accent)' }}
                              />
                              Current
                            </span>
                          ) : null}
                        </div>
                        {exp.description?.trim() ? (
                          <p className="mt-4 text-sm md:text-base text-foreground/80 leading-relaxed whitespace-pre-wrap">
                            {exp.description}
                          </p>
                        ) : null}
                        {exp.technologies?.length ? (
                          <div className="flex flex-wrap gap-1.5 mt-5">
                            {exp.technologies.map((t) => (
                              <TechChip key={t} tech={t} subtle />
                            ))}
                          </div>
                        ) : null}
                        </div>
                      </article>
                    </li>
                  </StaggerChild>
                )
              })}
            </ol>
          </section>
        ) : null}

        {/* Projects */}
        {projects.length > 0 ? (
          <section id="projects" className="scroll-mt-28">
            <StaggerChild staggerIndex={0}>
              <SectionHeading
                icon={FolderKanban}
                title="Projects"
                subtitle="Selected work — products, experiments, and open source."
                variant={layoutTheme}
                count={projects.length}
                index={2}
              />
            </StaggerChild>
            <div className="mx-auto grid max-w-5xl grid-cols-2 gap-2 sm:gap-2.5 md:grid-cols-3 xl:grid-cols-4">
              {projects.map((proj, i) => {
                const primaryHref = proj.liveUrl?.trim() || proj.githubUrl?.trim()
                return (
                  <StaggerChild key={proj.id} staggerIndex={i + 1}>
                    <article
                      className={cn(
                        'group portfolio-print-card relative flex h-full flex-col overflow-hidden p-2 sm:p-2.5',
                        cardClass,
                      )}
                    >
                      <div className="relative h-[4.25rem] w-full shrink-0 overflow-hidden rounded-md border border-border/40 bg-muted/30 sm:h-[4.75rem]">
                        <ProjectThumbnail
                          title={proj.title}
                          imageUrl={proj.imageUrl}
                          liveUrl={proj.liveUrl}
                          githubUrl={proj.githubUrl}
                        />
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col pt-1.5">
                        <div className="flex items-start justify-between gap-1">
                          <h3 className="line-clamp-2 text-[11px] font-semibold leading-tight text-foreground sm:text-xs">
                            {proj.title}
                          </h3>
                          {primaryHref ? (
                            <a
                              href={primaryHref}
                              target="_blank"
                              rel="noreferrer"
                              aria-label={`Open ${proj.title}`}
                              className="inline-flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-md border border-border/50 text-muted-foreground transition-colors hover:border-[color:var(--portfolio-accent)]/50 hover:text-[color:var(--portfolio-accent)]"
                            >
                              <ArrowUpRight className="h-3 w-3" />
                            </a>
                          ) : null}
                        </div>
                        <p className="mt-1 line-clamp-2 text-[10px] leading-snug text-muted-foreground sm:text-[11px]">
                          {proj.description}
                        </p>
                        {proj.technologies?.length ? (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {proj.technologies.slice(0, 4).map((t) => (
                              <TechChip key={t} tech={t} subtle />
                            ))}
                            {proj.technologies.length > 4 ? (
                              <span className="self-center text-[9px] text-muted-foreground/70">
                                +{proj.technologies.length - 4}
                              </span>
                            ) : null}
                          </div>
                        ) : null}
                        <div className="mt-auto flex flex-wrap gap-1 pt-2">
                          {proj.liveUrl?.trim() ? (
                            <a
                              href={proj.liveUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex cursor-pointer items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-medium text-white transition-opacity hover:opacity-90"
                              style={{ backgroundColor: 'var(--portfolio-accent)' }}
                              title="Live demo"
                            >
                              <ExternalLink className="h-2.5 w-2.5" />
                              <span className="hidden sm:inline">Live</span>
                            </a>
                          ) : null}
                          {proj.githubUrl?.trim() ? (
                            <a
                              href={proj.githubUrl}
                              target="_blank"
                              rel="noreferrer"
                              title="Source"
                              className="inline-flex cursor-pointer items-center gap-0.5 rounded-md border border-border/50 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                            >
                              <Github className="h-2.5 w-2.5" />
                              <span className="hidden sm:inline">Code</span>
                            </a>
                          ) : null}
                        </div>
                      </div>
                    </article>
                  </StaggerChild>
                )
              })}
            </div>
          </section>
        ) : null}

        {/* Education */}
        {education.length > 0 ? (
          <section id="education" className="scroll-mt-28">
            <StaggerChild staggerIndex={0}>
              <SectionHeading
                icon={GraduationCap}
                title="Education"
                subtitle="Degrees, programs, and academic highlights."
                variant={layoutTheme}
                count={education.length}
                index={3}
              />
            </StaggerChild>
            <div className="grid gap-5 md:grid-cols-2">
              {education.map((ed, i) => (
                <StaggerChild key={ed.id} staggerIndex={i + 1}>
                  <article className={cn('h-full portfolio-print-card overflow-hidden', cardClass, layoutTheme !== 'terminal' && 'p-6 md:p-7')}>
                    {layoutTheme === 'terminal' ? (
                      <TerminalTitlebar label="education.sh" />
                    ) : null}
                    <div className={cn(layoutTheme === 'terminal' && 'p-5 md:p-6')}>
                    <h3 className="font-semibold text-foreground leading-snug">{ed.degree}</h3>
                    <p className="text-[color:var(--portfolio-accent)] text-sm font-medium mt-1">
                      {ed.institution}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2 tabular-nums">
                      {formatPeriod(ed.startDate, ed.endDate)}
                    </p>
                    {ed.description?.trim() ? (
                      <p className="mt-4 text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
                        {ed.description}
                      </p>
                    ) : null}
                    </div>
                  </article>
                </StaggerChild>
              ))}
            </div>
          </section>
        ) : null}

        {/* Certifications */}
        {certifications.length > 0 ? (
          <section id="certifications" className="scroll-mt-28">
            <StaggerChild staggerIndex={0}>
              <SectionHeading
                icon={Award}
                title="Certifications"
                subtitle="Credentials and proof of craft."
                variant={layoutTheme}
                count={certifications.length}
                index={4}
              />
            </StaggerChild>
            <div className="grid gap-4 sm:grid-cols-2">
              {certifications.map((c, i) => (
                <StaggerChild key={c.id} staggerIndex={i + 1}>
                  <article className={cn('flex flex-col h-full portfolio-print-card overflow-hidden', cardClass, layoutTheme !== 'terminal' && 'p-6')}>
                    {layoutTheme === 'terminal' ? (
                      <TerminalTitlebar label="cert.sh" />
                    ) : null}
                    <div className={cn('flex flex-col flex-1', layoutTheme === 'terminal' && 'p-5')}>
                    <div className="flex items-start gap-3">
                      <div
                        className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center"
                        style={{
                          background: `color-mix(in srgb, var(--portfolio-accent) 12%, transparent)`,
                          color: 'var(--portfolio-accent)',
                        }}
                      >
                        <Award className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-foreground leading-snug">{c.name}</h3>
                        <p className="text-sm text-[color:var(--portfolio-accent)] mt-0.5">{c.issuer}</p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-3 tabular-nums">
                      {c.issueDate ? `Issued ${formatSingleDate(c.issueDate)}` : null}
                      {c.issueDate && c.expiryDate ? ' · ' : ''}
                      {c.expiryDate ? `Expires ${formatSingleDate(c.expiryDate)}` : null}
                    </p>
                    {c.credentialUrl?.trim() ? (
                      <a
                        href={c.credentialUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-sm font-medium text-[color:var(--portfolio-accent)] mt-4 hover:underline cursor-pointer"
                      >
                        Verify credential
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </a>
                    ) : null}
                    </div>
                  </article>
                </StaggerChild>
              ))}
            </div>
          </section>
        ) : null}

        {/* Tech stack */}
        {techStacks.length > 0 ? (
          <section id="stack" className="scroll-mt-28">
            <StaggerChild staggerIndex={0}>
              <SectionHeading
                icon={Layers}
                title="Tech stack"
                subtitle="Tools and technologies in regular rotation."
                variant={layoutTheme}
                count={techStacks.length}
                index={5}
              />
            </StaggerChild>
            <StaggerChild staggerIndex={1}>
              <div className={cn('portfolio-print-card overflow-hidden', cardClass, layoutTheme !== 'terminal' && 'p-6 md:p-8')}>
                {layoutTheme === 'terminal' ? (
                  <TerminalTitlebar label="stack.sh" />
                ) : null}
                <div className={cn(layoutTheme === 'terminal' && 'p-5 md:p-6')}>
                {techStacks.length >= 10 ? (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                    {techStacks.map((tech) => {
                      const meta = TECH_CATALOG.find((t) => t.name === tech)
                      const src = meta ? (meta.iconUrl ?? `https://cdn.simpleicons.org/${meta.slug}/${meta.color}`) : null
                      return (
                        <div
                          key={tech}
                          className="group flex flex-col items-center gap-2 p-3 rounded-xl border border-border/30 bg-muted/15 hover:border-[color:var(--portfolio-accent)]/35 hover:bg-muted/35 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md cursor-default"
                        >
                          {src ? (
                            <img src={src} alt="" width={24} height={24} className="w-6 h-6 object-contain" loading="lazy" />
                          ) : (
                            <div className="w-6 h-6 rounded-md bg-muted/50 flex items-center justify-center">
                              <Code2 className="h-3 w-3 text-muted-foreground/50" />
                            </div>
                          )}
                          <span className="text-[11px] font-medium text-muted-foreground group-hover:text-foreground transition-colors text-center leading-tight line-clamp-1">
                            {tech}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {techStacks.map((tech) => (
                      <TechChip key={tech} tech={tech} large />
                    ))}
                  </div>
                )}
                </div>
              </div>
            </StaggerChild>
          </section>
        ) : null}

        {/* GitHub */}
        {showGithub ? (
          <section id="github" className="scroll-mt-28 portfolio-print-hide">
            <StaggerChild staggerIndex={0}>
              <SectionHeading
                icon={layoutTheme === 'terminal' ? Terminal : Github}
                title="GitHub activity"
                subtitle="Contribution rhythm, streaks, and language mix."
                variant={layoutTheme}
              />
            </StaggerChild>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
              <StaggerChild staggerIndex={1} className="md:col-span-2">
                <div className={cn('p-5 md:p-6', cardClass)}>
                  <div className="flex items-center gap-2 mb-4">
                    <Calendar className="h-4 w-4 text-emerald-500" />
                    <span className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                      Contribution graph
                    </span>
                  </div>
                  <div className="w-full flex justify-center overflow-x-auto pb-1 portfolio-no-scrollbar">
                    {profile.github_username ? (
                      <GitHubCalendar
                        username={profile.github_username}
                        colorScheme={isDark ? 'dark' : 'light'}
                        blockSize={12}
                        blockMargin={3}
                        fontSize={11}
                        style={{ fontFamily: 'inherit' }}
                      />
                    ) : null}
                  </div>
                </div>
              </StaggerChild>
              <StaggerChild staggerIndex={2}>
                <div className={cn('p-5 md:p-6 h-full', cardClass)}>
                  <div className="flex items-center gap-2 mb-4">
                    <Flame className="h-4 w-4 text-orange-500" />
                    <span className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                      Streak
                    </span>
                  </div>
                  {profile.github_username ? (
                    <img
                      src={`https://github-readme-streak-stats.herokuapp.com/?user=${profile.github_username}&theme=${isDark ? 'transparent&ring=40c463&fire=40c463&currStreakLabel=40c463&stroke=ffffff20&text=ccc&sideNums=ccc&sideLabels=ccc' : 'transparent&ring=40c463&fire=40c463&currStreakLabel=40c463&stroke=00000020&text=333&sideNums=333&sideLabels=333'}&hide_border=true&background=00000000`}
                      alt={`${profile.github_username}'s GitHub streak`}
                      className="w-full h-auto object-contain pointer-events-none"
                      loading="lazy"
                    />
                  ) : null}
                </div>
              </StaggerChild>
              <StaggerChild staggerIndex={3}>
                <div className={cn('p-5 md:p-6 h-full', cardClass)}>
                  <div className="flex items-center gap-2 mb-4">
                    <ChartBar className="h-4 w-4 text-blue-500" />
                    <span className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                      Overview
                    </span>
                  </div>
                  {profile.github_username ? (
                    <img
                      src={`https://github-readme-stats.vercel.app/api?username=${profile.github_username}&show_icons=true&theme=${isDark ? 'transparent&text_color=ccc&icon_color=40c463&title_color=fff' : 'transparent&text_color=333&icon_color=40c463&title_color=000'}&hide_border=true&bg_color=00000000&rank_icon=github`}
                      alt="GitHub stats"
                      className="w-full h-auto object-contain pointer-events-none"
                      loading="lazy"
                    />
                  ) : null}
                </div>
              </StaggerChild>
              <StaggerChild staggerIndex={4} className="md:col-span-2">
                <div className={cn('p-5 md:p-6', cardClass)}>
                  <div className="flex items-center gap-2 mb-4">
                    <Code2 className="h-4 w-4 text-indigo-500" />
                    <span className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                      Top languages
                    </span>
                  </div>
                  {profile.github_username ? (
                    <img
                      src={`https://github-readme-stats.vercel.app/api/top-langs/?username=${profile.github_username}&layout=compact&theme=${isDark ? 'transparent&text_color=ccc&title_color=fff' : 'transparent&text_color=333&title_color=000'}&hide_border=true&bg_color=00000000&langs_count=10`}
                      alt="Top languages"
                      className="w-full h-auto object-contain pointer-events-none max-w-xl"
                      loading="lazy"
                    />
                  ) : null}
                </div>
              </StaggerChild>
            </div>
          </section>
        ) : null}
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-border/30 bg-background/65 backdrop-blur-xl mt-auto portfolio-print-hide">
        <div
          className={cn(
            'max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4',
            layoutTheme === 'minimal' && 'max-w-3xl',
          )}
        >
          <Link href="/" className="flex items-center gap-2.5 group cursor-pointer">
            <Logo size={20} showText className="opacity-50 group-hover:opacity-100 transition-opacity" />
          </Link>
          <p className="text-xs text-muted-foreground/60 text-center">
            Portfolio hosted on{' '}
            <Link
              href="/"
              className="text-[color:var(--portfolio-accent)]/80 hover:opacity-100 underline-offset-4 hover:underline font-medium transition-opacity cursor-pointer"
            >
              mydevtools.tech
            </Link>
          </p>
        </div>
      </footer>

      {/* Back-to-top */}
      <button
        type="button"
        onClick={scrollToTop}
        aria-label="Scroll to top"
        className={cn(
          'portfolio-print-hide fixed bottom-6 right-6 z-50 inline-flex items-center justify-center w-11 h-11 rounded-full border border-border/60 bg-background/80 backdrop-blur-md shadow-lg transition-all duration-300 cursor-pointer hover:-translate-y-0.5 hover:shadow-xl',
          showTop ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3 pointer-events-none',
        )}
        style={{
          boxShadow: showTop
            ? `0 10px 30px -10px color-mix(in srgb, var(--portfolio-accent) 40%, hsl(var(--foreground) / 0.2))`
            : undefined,
        }}
      >
        <ArrowUp className="h-4 w-4 text-[color:var(--portfolio-accent)]" />
      </button>
    </div>
  )
}
