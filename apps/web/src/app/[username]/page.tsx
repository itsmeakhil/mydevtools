'use client'

import React, { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Link as LinkIcon, Globe, Twitter, Linkedin, Instagram, Youtube, Hash, Flame, MapPin, AtSign, Calendar, MapPinOff } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useTheme } from 'next-themes'
import { GitHubCalendar } from 'react-github-calendar'

const SOCIAL_PLATFORMS = {
  website: { label: 'Website', icon: Globe },
  twitter: { label: 'Twitter', icon: Twitter },
  linkedin: { label: 'LinkedIn', icon: Linkedin },
  instagram: { label: 'Instagram', icon: Instagram },
  youtube: { label: 'YouTube', icon: Youtube },
  devto: { label: 'Dev.to', icon: LinkIcon },
  hashnode: { label: 'Hashnode', icon: Hash },
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
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background space-y-4">
        <h1 className="text-4xl font-bold tracking-tight text-primary">404</h1>
        <p className="text-muted-foreground text-lg">Profile Not Found</p>
      </div>
    )
  }

  const isDark = theme === 'dark'

  return (
    <div className="min-h-screen bg-background relative isolate overflow-hidden w-full flex-1 w-[100vw]">
      {/* Decorative gradient blur */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))] dark:bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.1),rgba(255,255,255,0))] w-full"></div>

      <div className="w-full max-w-4xl mx-auto px-4 py-16 sm:py-24 flex flex-col items-center">
        {/* Avatar and Identity */}
        <div className="flex flex-col items-center text-center space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <Avatar className="h-32 w-32 md:h-40 md:w-40 border-4 border-background shadow-xl ring-2 ring-primary/20">
            <AvatarImage src={profile.photo_url || undefined} alt={profile.display_name || 'User Avatar'} />
            <AvatarFallback className="text-4xl">{profile.display_name?.charAt(0) || profile.username?.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>

          <div className="space-y-1 mt-4">
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
              {profile.display_name || profile.username}
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground flex items-center justify-center gap-1.5 font-medium">
              <AtSign className="h-4 w-4" />
              {profile.username}
            </p>
          </div>

          {/* Social Links Row */}
          {profile.social_links && Object.values(profile.social_links).some((val: any) => val && val.trim() !== '') && (
            <div className="flex flex-wrap justify-center gap-3 pt-4">
              {Object.entries(SOCIAL_PLATFORMS).map(([key, platform]) => {
                const url = profile.social_links[key]
                if (!url || url.trim() === '') return null
                const Icon = platform.icon
                const formattedUrl = url.startsWith('http') ? url : `https://${url}`
                return (
                  <a
                    key={key}
                    href={formattedUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="w-12 h-12 rounded-full border bg-card/50 backdrop-blur-sm shadow-sm hover:scale-110 hover:shadow-md flex items-center justify-center transition-all duration-300 text-muted-foreground hover:text-primary"
                    title={platform.label}
                  >
                    <Icon className="h-5 w-5" />
                  </a>
                )
              })}
            </div>
          )}
        </div>

        {/* GitHub Stats Block */}
        {profile.github_username && (
          <div className="w-full mt-16 space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150 fill-mode-both">
            {/* Streak & Contributions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
              <div className="rounded-2xl border bg-card/40 backdrop-blur-md p-6 shadow-sm flex flex-col items-center justify-center w-full">
                <div className="flex items-center gap-2 mb-4 text-sm font-semibold tracking-wide text-foreground uppercase w-full justify-start">
                  <Flame className="h-4 w-4 text-orange-500" />
                  GitHub Streak
                </div>
                <img 
                  src={`https://github-readme-streak-stats.herokuapp.com/?user=${profile.github_username}&theme=${isDark ? 'transparent&ring=40c463&fire=40c463&currStreakLabel=40c463&stroke=ffffff20&text=ccc&sideNums=ccc&sideLabels=ccc' : 'transparent&ring=40c463&fire=40c463&currStreakLabel=40c463&stroke=00000020&text=333&sideNums=333&sideLabels=333'}&hide_border=true&background=00000000`} 
                  alt={`${profile.github_username}'s GitHub Streak`} 
                  className="w-full h-auto object-contain pointer-events-none drop-shadow-sm"
                />
              </div>

              <div className="rounded-2xl border bg-card/40 backdrop-blur-md p-6 shadow-sm flex flex-col items-center justify-center overflow-x-auto custom-scrollbar w-full">
                <div className="flex items-center gap-2 mb-4 text-sm font-semibold tracking-wide text-foreground uppercase w-full justify-start">
                  <Calendar className="h-4 w-4 text-green-500" />
                  Commits Activity
                </div>
                 <div className="w-full flex justify-center pb-2">
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
          </div>
        )}
      </div>
    </div>
  )
}
