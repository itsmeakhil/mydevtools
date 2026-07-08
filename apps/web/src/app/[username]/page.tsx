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
  Sparkles,
  Layers,
  ArrowUpRight,
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import Link from 'next/link'
import { Logo } from '@/components/logo'
import { MdtStatusPage } from '@/components/mdt-status-page'
import { TECH_CATALOG } from '@/components/tech-catalog'
import { GithubStatsSection } from './github-stats-lazy'

function StaggerChild({
  children,
  index,
  className = '',
}: {
  children: React.ReactNode
  index: number
  className?: string
}) {
  return (
    <div
      className={`opacity-0 ${className}`}
      style={{
        animation: `profileFadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards`,
        animationDelay: `${index * 100}ms`,
      }}
    >
      {children}
    </div>
  )
}

type PublicProfile = {
  username: string
  display_name?: string | null
  photo_url?: string | null
  github_username?: string | null
  bio?: string | null
  social_links?: Record<string, string> | null
  tech_stacks?: string[] | null
}

/* ──────────────────────────────────────────────────────────────────────── */
/*  Social platform config                                                 */
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
    bgAccent: 'group-hover:bg-blue-500/10 group-hover:border-blue-500/25',
  },
  twitter: {
    label: 'Twitter / X',
    icon: Twitter,
    hoverColor: 'group-hover:text-sky-500',
    bgAccent: 'group-hover:bg-sky-500/10 group-hover:border-sky-500/25',
  },
  linkedin: {
    label: 'LinkedIn',
    icon: Linkedin,
    hoverColor: 'group-hover:text-blue-600',
    bgAccent: 'group-hover:bg-blue-600/10 group-hover:border-blue-600/25',
  },
  instagram: {
    label: 'Instagram',
    icon: Instagram,
    hoverColor: 'group-hover:text-pink-500',
    bgAccent: 'group-hover:bg-pink-500/10 group-hover:border-pink-500/25',
  },
  youtube: {
    label: 'YouTube',
    icon: Youtube,
    hoverColor: 'group-hover:text-red-500',
    bgAccent: 'group-hover:bg-red-500/10 group-hover:border-red-500/25',
  },
  devto: {
    label: 'Dev.to',
    icon: LinkIcon,
    hoverColor: 'group-hover:text-foreground',
    bgAccent: 'group-hover:bg-foreground/10 group-hover:border-foreground/25',
  },
  hashnode: {
    label: 'Hashnode',
    icon: Hash,
    hoverColor: 'group-hover:text-blue-500',
    bgAccent: 'group-hover:bg-blue-500/10 group-hover:border-blue-500/25',
  },
}

async function getPublicProfile(username: string): Promise<PublicProfile | null> {
  const baseUrl = process.env.NEXT_PUBLIC_FASTAPI_BASE_URL
  if (!baseUrl) return null
  try {
    const res = await fetch(`${baseUrl}/api/v1/users/${encodeURIComponent(username)}`, {
      cache: 'no-store',
    })
    if (!res.ok) return null
    return (await res.json()) as PublicProfile
  } catch {
    return null
  }
}

/* ──────────────────────────────────────────────────────────────────────── */
/*  Main component — server-rendered so profile data ships in the initial  */
/*  HTML instead of a client fetch-after-mount waterfall (was the LCP      */
/*  bottleneck: full-page skeleton until /api/backend/users/* resolved).   */
/* ──────────────────────────────────────────────────────────────────────── */
export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ username: string }>
}) {
  const { username } = await params
  const profile = await getPublicProfile(username)

  if (!profile) {
    return (
      <MdtStatusPage
        code="404"
        kicker="Profile not found"
        title="This profile doesn't exist yet."
        description={`@${username} hasn't been claimed. Grab the handle and create your own developer profile for free.`}
        diagnostics={[
          'looking up developer profile…',
          `GET /@${username} → 404 NOT_CLAIMED`,
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

  const hasSocials =
    profile.social_links &&
    Object.values(profile.social_links).some((val) => typeof val === 'string' && val.trim() !== '')
  const hasGithub = !!profile.github_username
  const displayName = profile.display_name || profile.username
  const initials = displayName?.charAt(0)?.toUpperCase() || '?'

  return (
    <div className="min-h-screen bg-background relative isolate flex flex-col">
      {/* ── Decorative ambient gradients (CSS dark: variants, no JS theme needed) ── */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-[30%] left-1/2 -translate-x-1/2 w-[160%] h-[80%] blur-3xl opacity-60 bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.08),transparent_55%)] dark:bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.06),transparent_55%)]" />
        <div className="absolute -bottom-[20%] -right-[20%] w-[70%] h-[50%] blur-3xl opacity-40 bg-[radial-gradient(ellipse_at_center,hsl(160_60%_40%/0.06),transparent_50%)] dark:bg-[radial-gradient(ellipse_at_center,hsl(160_60%_40%/0.04),transparent_50%)]" />
        <div
          className="absolute inset-0 opacity-[0.015] dark:opacity-[0.03]"
          style={{
            backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />
      </div>

      {/* ── Top Navigation Bar ── */}
      <header className="w-full border-b border-border/30 bg-background/60 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <Logo size={26} showText className="group-hover:opacity-80 transition-opacity" />
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors px-3.5 py-1.5 rounded-full border border-border/60 hover:border-border hover:bg-muted/40"
          >
            Explore Tools
            <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
        {/* ── Profile Hero ── */}
        <section className="flex flex-col items-center text-center">
          {/* Avatar */}
          <StaggerChild index={0}>
            <div className="relative" style={{ animation: 'subtleFloat 6s ease-in-out infinite' }}>
              <div className="relative">
                <Avatar
                  className="h-28 w-28 md:h-36 md:w-36 border-[3px] border-background shadow-2xl ring-[3px] ring-primary/10"
                  style={{ animation: 'ringPulse 3s ease-in-out infinite' }}
                >
                  <AvatarImage src={profile.photo_url || undefined} alt={displayName} />
                  <AvatarFallback className="text-3xl md:text-4xl font-bold bg-gradient-to-br from-primary/10 to-primary/5 text-primary">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="absolute bottom-1.5 right-1.5 w-4 h-4 bg-emerald-500 rounded-full border-[2.5px] border-background shadow-sm shadow-emerald-500/30" />
              </div>
            </div>
          </StaggerChild>

          {/* Name + handle */}
          <StaggerChild index={1} className="mt-6 space-y-1.5">
            <h1 className="text-3xl md:text-4xl lg:text-[2.75rem] font-bold tracking-tight text-foreground leading-tight">
              {displayName}
            </h1>
            <p className="text-sm md:text-base text-muted-foreground flex items-center justify-center gap-1 font-medium">
              <AtSign className="h-3.5 w-3.5 opacity-50" />
              <span>{profile.username}</span>
            </p>
            {profile.bio && String(profile.bio).trim().length > 0 && (
              <p className="text-sm md:text-base text-foreground/70 max-w-2xl mx-auto leading-relaxed mt-3 whitespace-pre-wrap">
                {profile.bio}
              </p>
            )}
          </StaggerChild>

          {/* ── Social Links ── */}
          {(hasSocials || hasGithub) && (
            <StaggerChild index={2} className="mt-7">
              <div className="flex flex-wrap justify-center gap-2">
                {Object.entries(SOCIAL_PLATFORMS).map(([key, platform]) => {
                  const url = profile.social_links?.[key]
                  if (!url || url.trim() === '') return null
                  const Icon = platform.icon
                  const formattedUrl = url.startsWith('http') ? url : `https://${url}`
                  return (
                    <a
                      key={key}
                      href={formattedUrl}
                      target="_blank"
                      rel="noreferrer"
                      title={platform.label}
                      className={`group relative inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border/50 bg-card/40 backdrop-blur-sm text-muted-foreground text-sm font-medium transition-all duration-300 hover:shadow-md hover:scale-[1.02] ${platform.bgAccent}`}
                    >
                      <Icon className={`h-4 w-4 transition-colors ${platform.hoverColor}`} />
                      <span className={`transition-colors ${platform.hoverColor}`}>{platform.label}</span>
                    </a>
                  )
                })}
                {hasGithub && (
                  <a
                    href={`https://github.com/${profile.github_username}`}
                    target="_blank"
                    rel="noreferrer"
                    title="GitHub"
                    className="group relative inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border/50 bg-card/40 backdrop-blur-sm text-muted-foreground text-sm font-medium transition-all duration-300 hover:shadow-md hover:scale-[1.02] group-hover:bg-foreground/10 group-hover:border-foreground/25 hover:text-foreground hover:bg-foreground/5 hover:border-foreground/20"
                  >
                    <Github className="h-4 w-4 transition-colors group-hover:text-foreground" />
                    <span className="transition-colors group-hover:text-foreground">GitHub</span>
                  </a>
                )}
              </div>
            </StaggerChild>
          )}
        </section>

        {/* ── Tech Stack ── */}
        {(profile.tech_stacks?.length ?? 0) > 0 && (
          <section className="w-full mt-12">
            <StaggerChild index={3}>
              <div className="flex items-center gap-2.5 mb-5">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
                  <Layers className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold tracking-tight text-foreground">Tech Stack</h2>
                  <p className="text-xs text-muted-foreground">Technologies and tools</p>
                </div>
              </div>
              <div className="rounded-2xl border border-border/40 bg-card/30 backdrop-blur-md p-5 shadow-sm">
                <div className="flex flex-wrap gap-2">
                  {profile.tech_stacks!.map((tech: string) => {
                    const meta = TECH_CATALOG.find((t) => t.name === tech)
                    const src = meta ? (meta.iconUrl ?? `https://cdn.simpleicons.org/${meta.slug}/${meta.color}`) : null
                    return (
                      <span
                        key={tech}
                        className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-sm font-medium border border-border/50 bg-muted/40 text-foreground/80 hover:bg-primary/10 hover:border-primary/30 hover:text-primary transition-colors"
                      >
                        {src && (
                          <img
                            src={src}
                            alt={tech}
                            width={14}
                            height={14}
                            className="w-3.5 h-3.5 object-contain shrink-0"
                            loading="lazy"
                          />
                        )}
                        {tech}
                      </span>
                    )
                  })}
                </div>
              </div>
            </StaggerChild>
          </section>
        )}

        {/* ── GitHub Stats (client-only, lazy: needs theme + fetches its own contribution data) ── */}
        {hasGithub && (
          <StaggerChild index={4}>
            <GithubStatsSection githubUsername={profile.github_username!} />
          </StaggerChild>
        )}
      </main>

      {/* ── Branded Footer ── */}
      <footer className="w-full border-t border-border/30 bg-background/60 backdrop-blur-xl mt-auto">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2.5 group">
            <Logo size={20} showText className="opacity-50 group-hover:opacity-100 transition-opacity" />
          </Link>
          <p className="text-xs text-muted-foreground/50 text-center">
            Create your own developer profile at{' '}
            <Link
              href="/"
              className="text-primary/70 hover:text-primary underline-offset-4 hover:underline font-medium transition-colors"
            >
              mydevtools.tech
            </Link>
          </p>
        </div>
      </footer>
    </div>
  )
}
