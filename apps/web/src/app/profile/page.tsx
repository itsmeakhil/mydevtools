'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { User, Edit2, CheckCircle2, X, AlertCircle, Link as LinkIcon, Globe, Twitter, Linkedin, Instagram, Youtube, Hash } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import useAuth from '@/utils/useAuth'
import { useTranslations } from 'next-intl'
import { GithubProfileWidget } from '@/components/github-profile-widget'
import { backendFetch } from '@/lib/backend-auth'

export default function ProfilePage() {
  const t = useTranslations('SettingsPage')
  const { user } = useAuth()
  const [mounted, setMounted] = useState(false)
  const [username, setUsername] = useState<string | null>(null)
  const [editUsernameVal, setEditUsernameVal] = useState('')
  const [isEditingUsername, setIsEditingUsername] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  
  const [socialLinks, setSocialLinks] = useState<Record<string, string>>({})
  const [isEditingSocial, setIsEditingSocial] = useState(false)
  const [editSocialLinks, setEditSocialLinks] = useState<Record<string, string>>({})

  const SOCIAL_PLATFORMS = [
    { id: 'website', label: 'Website', icon: Globe, placeholder: 'https://example.com' },
    { id: 'twitter', label: 'Twitter', icon: Twitter, placeholder: 'https://twitter.com/username' },
    { id: 'linkedin', label: 'LinkedIn', icon: Linkedin, placeholder: 'https://linkedin.com/in/username' },
    { id: 'instagram', label: 'Instagram', icon: Instagram, placeholder: 'https://instagram.com/username' },
    { id: 'youtube', label: 'YouTube', icon: Youtube, placeholder: 'https://youtube.com/@username' },
    { id: 'devto', label: 'Dev.to', icon: LinkIcon, placeholder: 'https://dev.to/username' },
    { id: 'hashnode', label: 'Hashnode', icon: Hash, placeholder: 'https://hashnode.com/@username' },
  ]

  useEffect(() => {
    setMounted(true)
    const loadProfile = async () => {
      try {
        const res = await backendFetch('/api/backend/auth/me')
        if (res.ok) {
          const profile = await res.json()
          setUsername(profile.username)
          if (profile.social_links) {
            setSocialLinks(profile.social_links)
          }
        }
      } catch (err) {
        console.error('Failed to resolve profile', err)
      }
    }
    loadProfile()
  }, [])

  const handleSaveUsername = async () => {
    setErrorMsg('')
    const trimmed = editUsernameVal.trim().toLowerCase()
    
    try {
      const res = await backendFetch('/api/backend/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: trimmed || null })
      })
      if (res.ok) {
        setUsername(trimmed || null)
        setIsEditingUsername(false)
      } else if (res.status === 409) {
        setErrorMsg('Username is already taken.')
      } else {
        setErrorMsg('Failed to update username.')
      }
    } catch (err) {
      setErrorMsg('Network error.')
    }
  }

  const handleSaveSocial = async () => {
    try {
      const res = await backendFetch('/api/backend/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ social_links: editSocialLinks })
      })
      if (res.ok) {
        setSocialLinks(editSocialLinks)
        setIsEditingSocial(false)
      } else {
        alert("Failed to update social links")
      }
    } catch (err) {
      alert("Network error.")
    }
  }

  if (!mounted) {
    return null
  }

  return (
    <div className="flex-1 space-y-8 p-8 max-w-5xl mx-auto w-full pt-20 lg:pt-8 bg-background/50">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Your Profile</h2>
          <p className="text-muted-foreground">Manage your identity, achievements, and GitHub stats.</p>
        </div>
      </div>

      <div className="grid gap-6">
        <Card className="border shadow-sm bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 opacity-70" />
              {t('userProfile.title')}
            </CardTitle>
            <CardDescription>
              {t('userProfile.description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {user ? (
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={user.photoURL || undefined} alt={user.displayName || t('userProfile.avatarAlt')} />
                  <AvatarFallback>{user.displayName?.charAt(0) || 'U'}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-xl font-medium flex items-center gap-2">
                    {user.displayName || t('userProfile.anonymousUser')}
                  </h3>
                  
                  <div className="mt-1 flex items-center min-h-[32px]">
                    {isEditingUsername ? (
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <Input 
                            value={editUsernameVal} 
                            onChange={(e) => setEditUsernameVal(e.target.value)} 
                            placeholder="Alphanumeric unique handle"
                            className="h-8 max-w-[200px] text-sm"
                            onKeyDown={(e) => e.key === 'Enter' && handleSaveUsername()}
                            autoFocus
                          />
                          <Button variant="ghost" size="icon" onClick={handleSaveUsername} className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-100 dark:hover:bg-green-900/30">
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => { setIsEditingUsername(false); setErrorMsg('') }} className="h-8 w-8 text-muted-foreground hover:text-foreground">
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        {errorMsg && (
                          <div className="flex items-center gap-1 text-[10px] text-red-500 font-medium">
                            <AlertCircle className="h-3 w-3" />
                            <span>{errorMsg}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 group">
                        <span className="text-sm font-semibold tracking-tight text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                          @{username || 'set_username'}
                        </span>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => { setEditUsernameVal(username || ''); setIsEditingUsername(true) }} 
                                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 text-muted-foreground hover:text-foreground"
                              >
                                <Edit2 className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Edit MyDevTools username</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    )}
                  </div>

                  <p className="text-sm text-muted-foreground mt-1.5">{user.email || t('userProfile.noEmailProvided')}</p>
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                {t('userProfile.notLoggedIn')}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border shadow-sm bg-card/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <LinkIcon className="h-5 w-5 opacity-70" />
                Social Links
              </CardTitle>
              <CardDescription>
                Share your presence across the web.
              </CardDescription>
            </div>
            {!isEditingSocial && (
               <Button variant="ghost" size="sm" onClick={() => { setEditSocialLinks(socialLinks || {}); setIsEditingSocial(true) }} className="h-8 gap-2 border">
                 <Edit2 className="h-3.5 w-3.5" />
                 Edit Links
               </Button>
            )}
          </CardHeader>
          <CardContent className="pt-4">
            {isEditingSocial ? (
              <div className="space-y-4 max-w-2xl">
                {SOCIAL_PLATFORMS.map((platform) => {
                  const Icon = platform.icon
                  return (
                    <div key={platform.id} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-muted/30 flex items-center justify-center shrink-0">
                        <Icon className="h-4 w-4 opacity-70" />
                      </div>
                      <Input 
                        placeholder={platform.placeholder}
                        value={editSocialLinks[platform.id] || ''}
                        onChange={(e) => setEditSocialLinks({...editSocialLinks, [platform.id]: e.target.value})}
                        className="flex-1"
                      />
                    </div>
                  )
                })}
                <div className="flex items-center gap-2 pt-2">
                  <Button onClick={handleSaveSocial} className="gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Save Links
                  </Button>
                  <Button variant="outline" onClick={() => setIsEditingSocial(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-4">
                {Object.keys(socialLinks).length === 0 || !Object.values(socialLinks).some(val => val && val.trim().length > 0) ? (
                  <p className="text-sm text-muted-foreground italic">No social links configured yet.</p>
                ) : (
                  SOCIAL_PLATFORMS.map((platform) => {
                    const val = socialLinks[platform.id]
                    if (!val || val.trim() === '') return null
                    const Icon = platform.icon
                    const formattedUrl = val.startsWith('http') ? val : `https://${val}`

                    return (
                      <TooltipProvider key={platform.id}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <a 
                              href={formattedUrl}
                              target="_blank" 
                              rel="noreferrer"
                              className="w-10 h-10 rounded-full border bg-background hover:bg-muted/50 flex items-center justify-center transition-colors"
                            >
                              <Icon className="h-4 w-4 opacity-80" />
                            </a>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{platform.label}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )
                  })
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <GithubProfileWidget />
      </div>
    </div>
  )
}
