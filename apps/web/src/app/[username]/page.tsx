'use client'

import React, { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
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
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import Link from 'next/link'
import { useTheme } from 'next-themes'
import { GitHubCalendar } from 'react-github-calendar'
import { Logo } from '@/components/logo'
import { TECH_CATALOG } from '@/components/tech-stack-picker'

/* ──────────────────────────────────────────────────────────────────────── */
/*  Social platform config                                                 */
/* ──────────────────────────────────────────────────────────────────────── */
const SOCIAL_PLATFORMS: Record<
  string,
  { label: string; icon: React.ComponentType<any>; hoverColor: string; bgAccent: string }
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

/* ──────────────────────────────────────────────────────────────────────── */
/*  Animated skeleton loader                                               */
/* ──────────────────────────────────────────────────────────────────────── */
function ProfileSkeleton() {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex flex-col">
      {/* Ambient bg */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120%] h-[60%] bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.04),transparent_60%)] blur-3xl animate-pulse" />
      </div>

      {/* Nav skeleton */}
      <header className="w-full border-b border-border/30 bg-background/60 backdrop-blur-xl h-14" />

      {/* Hero skeleton */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <div className="flex flex-col items-center gap-6 animate-pulse">
          <div className="h-32 w-32 md:h-36 md:w-36 rounded-full bg-muted/60" />
          <div className="space-y-3 flex flex-col items-center">
            <div className="h-8 w-56 rounded-lg bg-muted/60" />
            <div className="h-5 w-32 rounded-md bg-muted/40" />
          </div>
          <div className="flex gap-3 mt-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-10 w-10 rounded-full bg-muted/40" />
            ))}
          </div>
          <div className="w-full mt-10 grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="h-48 rounded-2xl bg-muted/30" />
            <div className="h-48 rounded-2xl bg-muted/30" />
          </div>
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

/* ──────────────────────────────────────────────────────────────────────── */
/*  Main component                                                         */
/* ──────────────────────────────────────────────────────────────────────── */
export default function PublicProfilePage() {
  const { username } = useParams()
  const { theme } = useTheme()
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const fetchPublicProfile = async () => {
      try {
        const res = await fetch(`/api/backend/users/${username}`)
        if (res.ok) {
          const data = await res.json()
          setProfile(data)
        } else {
          setError(true)
        }
      } catch (err) {
        setError(true)
      } finally {
        setLoading(false)
      }
    }
    if (username) {
      fetchPublicProfile()
    }
  }, [username])

  /* ── Loading state ── */
  if (!mounted || loading) {
    return <ProfileSkeleton />
  }

  /* ── Error / 404 state ── */
  if (error || !profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background relative overflow-hidden">
        {/* Ambient glow */}
        <div className="pointer-events-none fixed inset-0 -z-10">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[60%] h-[40%] bg-[radial-gradient(ellipse_at_center,hsl(var(--destructive)/0.06),transparent_60%)] blur-3xl" />
        </div>

        <div className="relative z-10 flex flex-col items-center gap-8 p-8">
          <Logo size={36} showText />
          <div className="text-center space-y-3">
            <h1 className="text-7xl md:text-8xl font-black tracking-tighter text-foreground/10 select-none">
              404
            </h1>
            <p className="text-lg text-muted-foreground font-medium">
              This profile doesn&apos;t exist yet.
            </p>
            <p className="text-sm text-muted-foreground/60 max-w-md">
              The username <span className="font-mono text-foreground/50">@{username}</span> hasn&apos;t been claimed.
              <br />Create your own developer profile for free.
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm font-medium px-5 py-2.5 rounded-full bg-primary text-primary-foreground hover:opacity-90 transition-opacity shadow-lg shadow-primary/20"
            >
              <Sparkles className="h-4 w-4" />
              Create Profile
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm font-medium px-5 py-2.5 rounded-full border border-border hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
            >
              Explore Tools
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const isDark = theme === 'dark'
  const hasSocials =
    profile.social_links &&
    Object.values(profile.social_links).some((val: any) => val && val.trim() !== '')
  const hasGithub = !!profile.github_username
  const displayName = profile.display_name || profile.username
  const initials = displayName?.charAt(0)?.toUpperCase() || '?'

  return (
    <div className="min-h-screen bg-background relative isolate overflow-hidden flex flex-col">
      {/* ── Keyframes injected via style tag ── */}
      <style jsx global>{`
        @keyframes profileFadeUp {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes meshGradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes subtleFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
        @keyframes ringPulse {
          0%, 100% { box-shadow: 0 0 0 0 hsl(var(--primary) / 0.15); }
          50% { box-shadow: 0 0 0 8px hsl(var(--primary) / 0); }
        }
      `}</style>

      {/* ── Decorative ambient gradients ── */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div
          className="absolute -top-[30%] left-1/2 -translate-x-1/2 w-[160%] h-[80%] blur-3xl opacity-60"
          style={{
            background: isDark
              ? 'radial-gradient(ellipse at center, hsl(var(--primary) / 0.06), transparent 55%)'
              : 'radial-gradient(ellipse at center, hsl(var(--primary) / 0.08), transparent 55%)',
          }}
        />
        <div
          className="absolute -bottom-[20%] -right-[20%] w-[70%] h-[50%] blur-3xl opacity-40"
          style={{
            background: isDark
              ? 'radial-gradient(ellipse at center, hsl(160 60% 40% / 0.04), transparent 50%)'
              : 'radial-gradient(ellipse at center, hsl(160 60% 40% / 0.06), transparent 50%)',
          }}
        />
        {/* Dot grid texture */}
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
            <div
              className="relative"
              style={{ animation: 'subtleFloat 6s ease-in-out infinite' }}
            >
              <div className="relative">
                <Avatar className="h-28 w-28 md:h-36 md:w-36 border-[3px] border-background shadow-2xl ring-[3px] ring-primary/10"
                  style={{ animation: 'ringPulse 3s ease-in-out infinite' }}
                >
                  <AvatarImage
                    src={profile.photo_url || undefined}
                    alt={displayName}
                  />
                  <AvatarFallback className="text-3xl md:text-4xl font-bold bg-gradient-to-br from-primary/10 to-primary/5 text-primary">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                {/* Online indicator */}
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
        {profile.tech_stacks?.length > 0 && (
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
                  {profile.tech_stacks.map((tech: string) => {
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

        {/* ── GitHub Stats Bento Grid ── */}
        {hasGithub && (
          <section className="w-full mt-14 space-y-5">
            <StaggerChild index={4}>
              <div className="flex items-center gap-2.5 mb-1">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
                  <Github className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold tracking-tight text-foreground">
                    GitHub Activity
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Contributions, streaks, and language stats
                  </p>
                </div>
              </div>
            </StaggerChild>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Contribution Calendar — full width */}
              <StaggerChild index={5} className="md:col-span-2">
                <div className="rounded-2xl border border-border/40 bg-card/30 backdrop-blur-md p-5 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                  <div className="flex items-center gap-2 mb-4">
                    <Calendar className="h-4 w-4 text-emerald-500" />
                    <span className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                      Contribution Graph
                    </span>
                  </div>
                  <div className="w-full flex justify-center overflow-x-auto custom-scrollbar pb-1">
                    <GitHubCalendar
                      username={profile.github_username}
                      colorScheme={isDark ? 'dark' : 'light'}
                      blockSize={12}
                      blockMargin={3}
                      fontSize={11}
                      style={{ fontFamily: 'inherit' }}
                    />
                  </div>
                </div>
              </StaggerChild>

              {/* Streak Stats */}
              <StaggerChild index={6}>
                <div className="rounded-2xl border border-border/40 bg-card/30 backdrop-blur-md p-5 shadow-sm hover:shadow-md transition-shadow h-full">
                  <div className="flex items-center gap-2 mb-4">
                    <Flame className="h-4 w-4 text-orange-500" />
                    <span className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                      Streak
                    </span>
                  </div>
                  <img
                    src={`https://github-readme-streak-stats.herokuapp.com/?user=${profile.github_username}&theme=${isDark ? 'transparent&ring=40c463&fire=40c463&currStreakLabel=40c463&stroke=ffffff20&text=ccc&sideNums=ccc&sideLabels=ccc' : 'transparent&ring=40c463&fire=40c463&currStreakLabel=40c463&stroke=00000020&text=333&sideNums=333&sideLabels=333'}&hide_border=true&background=00000000`}
                    alt={`${profile.github_username}'s GitHub Streak`}
                    className="w-full h-auto object-contain pointer-events-none"
                    loading="lazy"
                  />
                </div>
              </StaggerChild>

              {/* Overview Stats */}
              <StaggerChild index={7}>
                <div className="rounded-2xl border border-border/40 bg-card/30 backdrop-blur-md p-5 shadow-sm hover:shadow-md transition-shadow h-full">
                  <div className="flex items-center gap-2 mb-4">
                    <ChartBar className="h-4 w-4 text-blue-500" />
                    <span className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                      Overview
                    </span>
                  </div>
                  <img
                    src={`https://github-readme-stats.vercel.app/api?username=${profile.github_username}&show_icons=true&theme=${isDark ? 'transparent&text_color=ccc&icon_color=40c463&title_color=fff' : 'transparent&text_color=333&icon_color=40c463&title_color=000'}&hide_border=true&bg_color=00000000&rank_icon=github`}
                    alt="GitHub Stats"
                    className="w-full h-auto object-contain pointer-events-none"
                    loading="lazy"
                  />
                </div>
              </StaggerChild>

              {/* Top Languages */}
              <StaggerChild index={8} className="md:col-span-2">
                <div className="rounded-2xl border border-border/40 bg-card/30 backdrop-blur-md p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2 mb-4">
                    <Code2 className="h-4 w-4 text-indigo-500" />
                    <span className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                      Top Languages
                    </span>
                  </div>
                  <img
                    src={`https://github-readme-stats.vercel.app/api/top-langs/?username=${profile.github_username}&layout=compact&theme=${isDark ? 'transparent&text_color=ccc&title_color=fff' : 'transparent&text_color=333&title_color=000'}&hide_border=true&bg_color=00000000&langs_count=10`}
                    alt="Top Languages"
                    className="w-full h-auto object-contain pointer-events-none max-w-xl"
                    loading="lazy"
                  />
                </div>
              </StaggerChild>
            </div>
          </section>
        )}
      </main>

      {/* ── Branded Footer ── */}
      <footer className="w-full border-t border-border/30 bg-background/60 backdrop-blur-xl mt-auto">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2.5 group">
            <Logo
              size={20}
              showText
              className="opacity-50 group-hover:opacity-100 transition-opacity"
            />
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
