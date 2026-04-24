'use client'

import React, { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Link as LinkIcon, Globe, Twitter, Linkedin, Instagram, Youtube, Hash, Flame, AtSign, Calendar, Github } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import Link from 'next/link'
import Image from 'next/image'
import { useTheme } from 'next-themes'
import { GitHubCalendar } from 'react-github-calendar'
import { Logo } from '@/components/logo'

const SOCIAL_PLATFORMS = {
  website: { label: 'Website', icon: Globe, color: 'hover:text-blue-500 hover:border-blue-500/30 hover:bg-blue-500/5' },
  twitter: { label: 'Twitter / X', icon: Twitter, color: 'hover:text-sky-500 hover:border-sky-500/30 hover:bg-sky-500/5' },
  linkedin: { label: 'LinkedIn', icon: Linkedin, color: 'hover:text-blue-600 hover:border-blue-600/30 hover:bg-blue-600/5' },
  instagram: { label: 'Instagram', icon: Instagram, color: 'hover:text-pink-500 hover:border-pink-500/30 hover:bg-pink-500/5' },
  youtube: { label: 'YouTube', icon: Youtube, color: 'hover:text-red-500 hover:border-red-500/30 hover:bg-red-500/5' },
  devto: { label: 'Dev.to', icon: LinkIcon, color: 'hover:text-foreground hover:border-foreground/30 hover:bg-foreground/5' },
  hashnode: { label: 'Hashnode', icon: Hash, color: 'hover:text-blue-500 hover:border-blue-500/30 hover:bg-blue-500/5' },
}

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

  if (!mounted || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Logo size={36} showText={false} />
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background space-y-6">
        <Logo size={40} showText />
        <div className="text-center space-y-2">
          <h1 className="text-6xl font-bold tracking-tight text-primary/80">404</h1>
          <p className="text-muted-foreground text-lg">This profile doesn&apos;t exist yet.</p>
        </div>
        <Link href="/" className="text-sm text-primary hover:underline underline-offset-4">
          ← Back to MyDevTools
        </Link>
      </div>
    )
  }

  const isDark = theme === 'dark'
  const hasSocials = profile.social_links && Object.values(profile.social_links).some((val: any) => val && val.trim() !== '')
  const hasGithub = !!profile.github_username

  return (
    <div className="min-h-screen bg-background relative isolate overflow-hidden flex flex-col">
      {/* ── Decorative ambient gradients ── */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-[radial-gradient(ellipse_at_center,rgba(120,119,198,0.15),transparent_70%)] dark:bg-[radial-gradient(ellipse_at_center,rgba(120,119,198,0.08),transparent_70%)]" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[400px] bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.08),transparent_70%)] dark:bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.04),transparent_70%)]" />
      </div>

      {/* ── Top Navigation Bar ── */}
      <header className="w-full border-b border-border/40 bg-background/60 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <Logo size={28} showText className="group-hover:opacity-80 transition-opacity" />
          </Link>
          <Link
            href="/"
            className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-full border border-transparent hover:border-border hover:bg-muted/50"
          >
            Explore Tools →
          </Link>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-20">

        {/* ── Profile Hero ── */}
        <section className="flex flex-col items-center text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="relative">
            <Avatar className="h-28 w-28 md:h-36 md:w-36 border-[3px] border-background shadow-2xl ring-[3px] ring-primary/10">
              <AvatarImage src={profile.photo_url || undefined} alt={profile.display_name || 'User'} />
              <AvatarFallback className="text-3xl md:text-4xl font-semibold bg-primary/5 text-primary">
                {profile.display_name?.charAt(0) || profile.username?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {/* Online dot */}
            <span className="absolute bottom-1 right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-background shadow-sm" />
          </div>

          <div className="mt-6 space-y-2">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-foreground">
              {profile.display_name || profile.username}
            </h1>
            <p className="text-base md:text-lg text-muted-foreground flex items-center justify-center gap-1 font-medium">
              <AtSign className="h-4 w-4 opacity-60" />
              {profile.username}
            </p>
          </div>

          {/* ── Social Links ── */}
          {hasSocials && (
            <div className="flex flex-wrap justify-center gap-2.5 mt-6">
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
                    className={`group relative w-11 h-11 rounded-full border border-border/60 bg-card/50 backdrop-blur-sm shadow-sm flex items-center justify-center transition-all duration-300 text-muted-foreground hover:scale-105 hover:shadow-md ${platform.color}`}
                  >
                    <Icon className="h-[18px] w-[18px] transition-transform group-hover:scale-110" />
                  </a>
                )
              })}
              {hasGithub && (
                <a
                  href={`https://github.com/${profile.github_username}`}
                  target="_blank"
                  rel="noreferrer"
                  title="GitHub"
                  className="group relative w-11 h-11 rounded-full border border-border/60 bg-card/50 backdrop-blur-sm shadow-sm flex items-center justify-center transition-all duration-300 text-muted-foreground hover:scale-105 hover:shadow-md hover:text-foreground hover:border-foreground/30 hover:bg-foreground/5"
                >
                  <Github className="h-[18px] w-[18px] transition-transform group-hover:scale-110" />
                </a>
              )}
            </div>
          )}
        </section>

        {/* ── GitHub Stats ── */}
        {hasGithub && (
          <section className="w-full mt-14 space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-200 fill-mode-both">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Streak Card */}
              <div className="rounded-2xl border border-border/50 bg-card/30 backdrop-blur-md p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-3 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                  <Flame className="h-3.5 w-3.5 text-orange-500" />
                  Streak
                </div>
                <img
                  src={`https://github-readme-streak-stats.herokuapp.com/?user=${profile.github_username}&theme=${isDark ? 'transparent&ring=40c463&fire=40c463&currStreakLabel=40c463&stroke=ffffff20&text=ccc&sideNums=ccc&sideLabels=ccc' : 'transparent&ring=40c463&fire=40c463&currStreakLabel=40c463&stroke=00000020&text=333&sideNums=333&sideLabels=333'}&hide_border=true&background=00000000`}
                  alt={`${profile.github_username}'s GitHub Streak`}
                  className="w-full h-auto object-contain pointer-events-none"
                />
              </div>

              {/* Contribution Calendar Card */}
              <div className="rounded-2xl border border-border/50 bg-card/30 backdrop-blur-md p-5 shadow-sm overflow-x-auto custom-scrollbar">
                <div className="flex items-center gap-2 mb-3 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                  <Calendar className="h-3.5 w-3.5 text-green-500" />
                  Contributions
                </div>
                <div className="w-full flex justify-center pb-1">
                  <GitHubCalendar
                    username={profile.github_username}
                    colorScheme={isDark ? 'dark' : 'light'}
                    blockSize={11}
                    blockMargin={3}
                    fontSize={11}
                    style={{ fontFamily: 'inherit' }}
                  />
                </div>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* ── Branded Footer ── */}
      <footer className="w-full border-t border-border/40 bg-background/60 backdrop-blur-xl mt-auto">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2.5 group">
            <Logo size={22} showText className="opacity-60 group-hover:opacity-100 transition-opacity" />
          </Link>
          <p className="text-xs text-muted-foreground/60 text-center">
            Create your own developer profile at{' '}
            <Link href="/" className="text-primary/80 hover:text-primary underline-offset-4 hover:underline font-medium transition-colors">
              mydevtools.tech
            </Link>
          </p>
        </div>
      </footer>
    </div>
  )
}
