"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Github, Edit2, Trophy, ChartBar, GitCommit, CheckCircle2 } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useTranslations } from 'next-intl'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { GitHubCalendar } from 'react-github-calendar'
import { backendFetch } from '@/lib/backend-auth'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

export function GithubProfileWidget() {
  const [username, setUsername] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [savedUsername, setSavedUsername] = useState<string | null>(null)
  const { theme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [selectedYear, setSelectedYear] = useState<string>('last')
  const currentYear = new Date().getFullYear()
  const years = ['last', ...Array.from({length: 5}, (_, i) => String(currentYear - i))]

  useEffect(() => {
    setMounted(true)
    
    // We only want to fetch once mounted
    const fetchProfile = async () => {
      try {
        const res = await backendFetch('/api/backend/auth/me')
        if (res.ok) {
          const data = await res.json()
          if (data.github_username) {
            setSavedUsername(data.github_username)
            setUsername(data.github_username)
          } else {
            setIsEditing(true)
          }
        } else {
          setIsEditing(true)
        }
      } catch (err) {
        setIsEditing(true)
      }
    }
    
    fetchProfile()
  }, [])

  const handleSave = async () => {
    const trimmed = username.trim()
    try {
      const res = await backendFetch('/api/backend/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ github_username: trimmed || null })
      })
      if (res.ok) {
        setSavedUsername(trimmed || null)
        setIsEditing(false)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleEdit = () => {
    setIsEditing(true)
  }


  if (!mounted) return null

  const isDark = theme === 'dark'

  return (
    <Card className="border shadow-sm bg-card/50 backdrop-blur-sm overflow-hidden mt-6">
      <CardHeader className="border-b bg-muted/20 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Github className="h-5 w-5" />
              GitHub Achievements
            </CardTitle>
            <CardDescription className="mt-1.5">
              Connect your GitHub profile to showcase your contributions, stats, and programming languages.
            </CardDescription>
          </div>
          {!isEditing && savedUsername && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={handleEdit} className="h-8 w-8 text-muted-foreground hover:text-foreground">
                    <Edit2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Edit GitHub username</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-6">
        {isEditing ? (
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative w-full sm:max-w-md">
              <Github className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Enter your GitHub username (e.g. itsmeakhil)" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                className="pl-9"
                autoFocus
              />
            </div>
            <div className="flex w-full sm:w-auto gap-2">
              <Button onClick={handleSave} className="w-full sm:w-auto gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Save & Show Commits
              </Button>
              {savedUsername && (
                <Button variant="outline" onClick={() => { setIsEditing(false); setUsername(savedUsername) }} className="w-full sm:w-auto">
                  Cancel
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-6 animate-in fade-in duration-500 hidden-scrollbar">
            {/* Commits Graph */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground tracking-tight">
                  <GitCommit className="h-4 w-4 text-green-500" />
                  <span>Contributions</span>
                </div>
                <div className="w-[120px]">
                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map(y => (
                        <SelectItem key={y} value={y} className="text-xs">
                          {y === 'last' ? 'Last Year' : y}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="rounded-xl border bg-card p-4 overflow-x-auto dark:bg-zinc-950/20 shadow-sm flex justify-center custom-scrollbar">
                {savedUsername && (
                  <GitHubCalendar 
                    username={savedUsername} 
                    year={selectedYear === 'last' ? undefined : parseInt(selectedYear)}
                    colorScheme={isDark ? 'dark' : 'light'}
                    blockSize={12}
                    blockMargin={4}
                    fontSize={12}
                    style={{
                      fontFamily: 'inherit',
                    }}
                  />
                )}
              </div>
            </div>

            {/* Trophies */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground tracking-tight">
                <Trophy className="h-4 w-4 text-amber-500" />
                <span>Trophies</span>
              </div>
              <div className="overflow-x-auto pb-2 custom-scrollbar">
                <img 
                  src={`https://github-profile-trophy.vercel.app/?username=${savedUsername}&theme=${isDark ? 'radical' : 'flat'}&row=1&column=7&margin-w=15&margin-h=15`} 
                  alt={`${savedUsername}'s GitHub Trophies`} 
                  className="max-w-none h-36 object-contain"
                />
              </div>
            </div>

            {/* Stats and Languages */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <div className="space-y-3 w-full overflow-hidden">
                 <div className="flex items-center gap-2 text-sm font-medium text-foreground tracking-tight">
                  <ChartBar className="h-4 w-4 text-blue-500" />
                  <span>Overview Stats</span>
                </div>
                <img 
                  src={`https://github-readme-stats.vercel.app/api?username=${savedUsername}&show_icons=true&theme=${isDark ? 'transparent&text_color=ccc&icon_color=40c463&title_color=fff' : 'transparent&text_color=333&icon_color=40c463&title_color=000'}&hide_border=true&bg_color=00000000`}
                  alt="GitHub Stats" 
                  className="rounded-xl border bg-card dark:bg-zinc-950/20 shadow-sm h-full w-full object-contain object-left pointer-events-none"
                />
              </div>
              <div className="space-y-3 w-full overflow-hidden">
                 <div className="flex items-center gap-2 text-sm font-medium text-foreground tracking-tight">
                  <ChartBar className="h-4 w-4 text-indigo-500" />
                  <span>Top Languages</span>
                </div>
                <img 
                  src={`https://github-readme-stats.vercel.app/api/top-langs/?username=${savedUsername}&layout=compact&theme=${isDark ? 'transparent&text_color=ccc&title_color=fff' : 'transparent&text_color=333&title_color=000'}&hide_border=true&bg_color=00000000`}
                  alt="Top Languages" 
                  className="rounded-xl border bg-card dark:bg-zinc-950/20 shadow-sm h-full w-full object-contain object-left pointer-events-none"
                />
              </div>
            </div>
            
          </div>
        )}
      </CardContent>
    </Card>
  )
}
