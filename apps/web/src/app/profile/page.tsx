'use client'

import React, { useState, useEffect } from 'react'
import {
  User,
  Edit2,
  CheckCircle2,
  X,
  AlertCircle,
  Link as LinkIcon,
  Globe,
  Twitter,
  Linkedin,
  Instagram,
  Youtube,
  Hash,
  ExternalLink,
  Layers,
  Briefcase,
  Mail,
  AtSign,
  Github,
  ChevronDown,
  FileDown,
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import useAuth from '@/utils/useAuth'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { GithubProfileWidget } from '@/components/github-profile-widget'
import { backendFetch } from '@/lib/backend-auth'
import { cn } from '@/lib/utils'
import { generateResumePdf } from '@/lib/generate-resume-pdf'
import { TechStackPicker, TECH_CATALOG } from '@/components/tech-stack-picker'
import {
  ExperienceBuilder,
  ProjectsBuilder,
  EducationBuilder,
  PortfolioSettingsCard,
  PersonalInfoCard,
  CertificationsBuilder,
  type Experience,
  type Project,
  type Education,
  type PortfolioSettings,
  type PersonalInfo,
  type Certification,
} from '@/components/portfolio-builder'

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
  const [isCollapsedSocial, setIsCollapsedSocial] = useState(true)
  const [editSocialLinks, setEditSocialLinks] = useState<Record<string, string>>({})

  const [techStacks, setTechStacks] = useState<string[]>([])
  const [isEditingTech, setIsEditingTech] = useState(false)
  const [isCollapsedTech, setIsCollapsedTech] = useState(true)
  const [editTechStacks, setEditTechStacks] = useState<string[]>([])

  const [bio, setBio] = useState<string | null>(null)
  const [isEditingBio, setIsEditingBio] = useState(false)
  const [isCollapsedBio, setIsCollapsedBio] = useState(true)
  const [editBioVal, setEditBioVal] = useState('')

  const [isExportingResume, setIsExportingResume] = useState(false)

  const [experiences, setExperiences] = useState<Experience[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [education, setEducation] = useState<Education[]>([])
  const [certifications, setCertifications] = useState<Certification[]>([])
  const [portfolioSettings, setPortfolioSettings] = useState<PortfolioSettings>({})
  const [personalInfo, setPersonalInfo] = useState<PersonalInfo>({ languages: [], hobbies: [] })

  const SOCIAL_PLATFORMS = [
    { id: 'website', label: 'Website', icon: Globe, placeholder: 'https://example.com' },
    { id: 'github', label: 'GitHub', icon: Github, placeholder: 'https://github.com/username' },
    { id: 'linkedin', label: 'LinkedIn', icon: Linkedin, placeholder: 'https://linkedin.com/in/username' },
    { id: 'twitter', label: 'Twitter', icon: Twitter, placeholder: 'https://twitter.com/username' },
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
          setBio(profile.bio ?? null)
          if (profile.social_links) setSocialLinks(profile.social_links)
          if (profile.tech_stacks) setTechStacks(profile.tech_stacks)
          if (profile.experiences) setExperiences(profile.experiences)
          if (profile.projects) setProjects(profile.projects)
          if (profile.education) setEducation(profile.education)
          if (profile.certifications) setCertifications(profile.certifications)
          if (profile.portfolio_settings) setPortfolioSettings(profile.portfolio_settings)
          if (profile.personal_info) setPersonalInfo(profile.personal_info)
        }
      } catch (err) {
        console.error('Failed to resolve profile', err)
      }
    }
    loadProfile()
  }, [])

  const handleSaveBio = async () => {
    try {
      const res = await backendFetch('/api/backend/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bio: editBioVal }),
      })
      if (res.ok) {
        setBio(editBioVal)
        setIsEditingBio(false)
        toast.success('Bio updated.')
      } else {
        toast.error('Failed to update bio.')
      }
    } catch {
      toast.error('Network error.')
    }
  }

  const handleSaveUsername = async () => {
    setErrorMsg('')
    const trimmed = editUsernameVal.trim().toLowerCase()
    try {
      const res = await backendFetch('/api/backend/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: trimmed || null }),
      })
      if (res.ok) {
        setUsername(trimmed || null)
        setIsEditingUsername(false)
      } else if (res.status === 409) {
        setErrorMsg('Username is already taken.')
      } else {
        setErrorMsg('Failed to update username.')
      }
    } catch {
      setErrorMsg('Network error.')
    }
  }

  const handleSaveTechStacks = async () => {
    try {
      const res = await backendFetch('/api/backend/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tech_stacks: editTechStacks }),
      })
      if (res.ok) {
        setTechStacks(editTechStacks)
        setIsEditingTech(false)
        toast.success('Tech stack updated.')
      } else {
        toast.error('Failed to update tech stack.')
      }
    } catch {
      toast.error('Network error.')
    }
  }

  const handleSaveSocial = async () => {
    try {
      const res = await backendFetch('/api/backend/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ social_links: editSocialLinks }),
      })
      if (res.ok) {
        setSocialLinks(editSocialLinks)
        setIsEditingSocial(false)
        toast.success('Social links updated.')
      } else {
        toast.error('Failed to update social links.')
      }
    } catch {
      toast.error('Network error.')
    }
  }

  if (!mounted) return null

  const displayName = user?.displayName || username || 'Your Name'
  const initials = displayName.charAt(0).toUpperCase()

  const handleExportResume = async () => {
    try {
      setIsExportingResume(true)
      await generateResumePdf({
        displayName,
        email: user?.email,
        username,
        bio,
        personalInfo,
        socialLinks,
        techStacks,
        experiences,
        projects,
        education,
        certifications,
      })
      toast.success('Resume exported')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to export resume'
      toast.error(msg)
    } finally {
      setIsExportingResume(false)
    }
  }

  const completenessItems = [
    { label: 'Username', done: !!username },
    { label: 'Bio', done: !!bio && bio.trim().length > 0 },
    { label: 'Headline', done: !!personalInfo.headline },
    { label: 'Social link', done: Object.values(socialLinks).some((v) => v?.trim()) },
    { label: 'Tech stack', done: techStacks.length > 0 },
    { label: 'Experience', done: experiences.length > 0 },
    { label: 'Project', done: projects.length > 0 },
    { label: 'Education', done: education.length > 0 },
    { label: 'Certification', done: certifications.length > 0 },
    { label: 'Personal info', done: !!(personalInfo.phone || personalInfo.location) },
  ]
  const completedCount = completenessItems.filter((i) => i.done).length
  const completenessPercent = Math.round((completedCount / completenessItems.length) * 100)
  const missing = completenessItems.filter((i) => !i.done)

  return (
    <div className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-8 pt-20 lg:pt-10 pb-16 space-y-8">
      {/* ── Page header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Your Profile</h2>
          <p className="text-muted-foreground text-sm mt-1">Manage your identity and developer portfolio.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleExportResume}
            disabled={isExportingResume}
            className="gap-2 shadow-sm rounded-full bg-muted/30 hover:bg-muted/60 border-border/50 hover:border-border transition-all"
          >
            <FileDown className="h-4 w-4" />
            {isExportingResume ? 'Exporting…' : 'Export Resume'}
          </Button>
          {username && (
            <Button asChild variant="outline" className="gap-2 shadow-sm rounded-full bg-primary/5 hover:bg-primary/10 border-primary/20 hover:border-primary/40 text-primary transition-all">
              <Link href={`/${username}`} target="_blank">
                View Public Profile
                <ExternalLink className="h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* ── Identity card ── */}
      <div className="rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm p-6 flex flex-col sm:flex-row items-center sm:items-start gap-5">
        <Avatar className="h-20 w-20 shrink-0 ring-2 ring-primary/10 ring-offset-2 ring-offset-background">
          <AvatarImage src={user?.photoURL || undefined} alt={displayName} />
          <AvatarFallback className="text-2xl font-bold bg-gradient-to-br from-primary/10 to-primary/5 text-primary">
            {initials}
          </AvatarFallback>
        </Avatar>

        <div className="flex flex-col items-center sm:items-start gap-2 text-center sm:text-left">
          {/* Display name */}
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <User className="h-4 w-4 opacity-40" />
            {user?.displayName || t('userProfile.anonymousUser')}
          </h3>

          {/* Username */}
          <div className="flex items-center min-h-[32px]">
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
                  <Button variant="ghost" size="icon" onClick={() => { setIsEditingUsername(false); setErrorMsg('') }} className="h-8 w-8 text-muted-foreground">
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
                <AtSign className="h-3.5 w-3.5 text-muted-foreground/50" />
                <span className="text-sm font-semibold tracking-tight text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                  {username || 'set_username'}
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
                    <TooltipContent><p>Edit username</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            )}
          </div>

          {/* Email */}
          {(user?.email) && (
            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 opacity-50" />
              {user.email}
            </p>
          )}
        </div>
      </div>

      {/* ── Completeness bar ── */}
      {completenessPercent < 100 && (
        <div className="rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm p-4 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Profile completeness</span>
            <span className={completenessPercent >= 80 ? 'text-emerald-500 font-semibold' : 'text-muted-foreground'}>
              {completenessPercent}%
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${completenessPercent}%`,
                background: completenessPercent >= 80
                  ? 'hsl(var(--primary))'
                  : completenessPercent >= 50
                  ? 'hsl(var(--primary) / 0.7)'
                  : 'hsl(var(--primary) / 0.4)',
              }}
            />
          </div>
          {missing.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Missing:{' '}
              {missing.map((m, i) => (
                <span key={m.label}>
                  <span className="font-medium text-foreground/70">{m.label}</span>
                  {i < missing.length - 1 ? ', ' : ''}
                </span>
              ))}
            </p>
          )}
        </div>
      )}

      {/* ── Tabs ── */}
      <Tabs defaultValue="details">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="details" className="flex-1 sm:flex-none gap-2">
            <LinkIcon className="h-3.5 w-3.5" />
            Details
          </TabsTrigger>
          <TabsTrigger value="career" className="flex-1 sm:flex-none gap-2">
            <Briefcase className="h-3.5 w-3.5" />
            Career
          </TabsTrigger>
        </TabsList>

        {/* ── Details Tab ── */}
        <TabsContent value="details" className="mt-6">
          <div className="rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm">
            {/* Personal Info */}
            <PersonalInfoCard info={personalInfo} onChange={setPersonalInfo} flat />

            {/* Bio */}
            <div>
              <div className="flex items-center justify-between px-5 pt-4 pb-3">
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold flex items-center gap-2 text-sm">
                    <Edit2 className="h-4 w-4 opacity-60" />
                    Bio
                  </h4>
                  {isCollapsedBio
                    ? <p className="text-xs text-muted-foreground mt-0.5 truncate">{bio && bio.trim() ? bio : 'Not set'}</p>
                    : <p className="text-xs text-muted-foreground mt-0.5">Short intro shown on your public profile.</p>
                  }
                </div>
                <div className="flex items-center gap-0.5 shrink-0 ml-2">
                  {!isCollapsedBio && !isEditingBio && (
                    <Button variant="ghost" size="icon" onClick={() => { setEditBioVal(bio || ''); setIsEditingBio(true); setIsCollapsedBio(false) }} className="h-7 w-7 text-muted-foreground hover:text-foreground">
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" onClick={() => setIsCollapsedBio(!isCollapsedBio)} className="h-7 w-7 text-muted-foreground hover:text-foreground">
                    <ChevronDown className={cn('h-4 w-4 transition-transform duration-200', !isCollapsedBio && 'rotate-180')} />
                  </Button>
                </div>
              </div>
              {!isCollapsedBio && (
                <div className="px-5 pb-5">
                  {isEditingBio ? (
                    <div className="space-y-3">
                      <Textarea
                        value={editBioVal}
                        onChange={(e) => setEditBioVal(e.target.value)}
                        placeholder="Tell people what you do, what you're building, or what you're into."
                        className="min-h-[100px]"
                        maxLength={280}
                      />
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Max 280 characters.</span>
                        <span className="tabular-nums">{editBioVal.length}/280</span>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={handleSaveBio} size="sm" className="gap-2">
                          <CheckCircle2 className="h-4 w-4" />
                          Save Bio
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => { setIsEditingBio(false); setEditBioVal(bio || '') }}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    !bio || bio.trim().length === 0
                      ? <p className="text-sm text-muted-foreground italic">No bio yet.</p>
                      : <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">{bio}</p>
                  )}
                </div>
              )}
            </div>

            {/* Social Links */}
            <div>
              <div className="flex items-center justify-between px-5 pt-4 pb-3">
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold flex items-center gap-2 text-sm">
                    <LinkIcon className="h-4 w-4 opacity-60" />
                    Social Links
                  </h4>
                  {isCollapsedSocial
                    ? <p className="text-xs text-muted-foreground mt-0.5">
                        {Object.values(socialLinks).filter(v => v?.trim()).length > 0
                          ? `${Object.values(socialLinks).filter(v => v?.trim()).length} link${Object.values(socialLinks).filter(v => v?.trim()).length !== 1 ? 's' : ''} configured`
                          : 'Not configured'}
                      </p>
                    : <p className="text-xs text-muted-foreground mt-0.5">Share your presence across the web.</p>
                  }
                </div>
                <div className="flex items-center gap-0.5 shrink-0 ml-2">
                  {!isCollapsedSocial && !isEditingSocial && (
                    <Button variant="ghost" size="icon" onClick={() => { setEditSocialLinks(socialLinks || {}); setIsEditingSocial(true); setIsCollapsedSocial(false) }} className="h-7 w-7 text-muted-foreground hover:text-foreground">
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" onClick={() => setIsCollapsedSocial(!isCollapsedSocial)} className="h-7 w-7 text-muted-foreground hover:text-foreground">
                    <ChevronDown className={cn('h-4 w-4 transition-transform duration-200', !isCollapsedSocial && 'rotate-180')} />
                  </Button>
                </div>
              </div>
              {!isCollapsedSocial && (
                <div className="px-5 pb-5">
                  {isEditingSocial ? (
                    <div className="space-y-3 max-w-2xl">
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
                              onChange={(e) => setEditSocialLinks({ ...editSocialLinks, [platform.id]: e.target.value })}
                              className="flex-1"
                            />
                          </div>
                        )
                      })}
                      <div className="flex gap-2 pt-1">
                        <Button onClick={handleSaveSocial} size="sm" className="gap-2">
                          <CheckCircle2 className="h-4 w-4" />
                          Save Links
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setIsEditingSocial(false)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-3">
                      {Object.keys(socialLinks).length === 0 || !Object.values(socialLinks).some(val => val && val.trim().length > 0)
                        ? <p className="text-sm text-muted-foreground italic">No social links configured yet.</p>
                        : SOCIAL_PLATFORMS.map((platform) => {
                            const val = socialLinks[platform.id]
                            if (!val || val.trim() === '') return null
                            const Icon = platform.icon
                            const formattedUrl = val.startsWith('http') ? val : `https://${val}`
                            return (
                              <TooltipProvider key={platform.id}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <a href={formattedUrl} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full border bg-background hover:bg-muted/50 flex items-center justify-center transition-colors">
                                      <Icon className="h-4 w-4 opacity-80" />
                                    </a>
                                  </TooltipTrigger>
                                  <TooltipContent><p>{platform.label}</p></TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )
                          })
                      }
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ── Career Tab ── */}
        <TabsContent value="career" className="space-y-6 mt-6">
          <div className="rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm">
            {/* Tech Stack */}
            <div>
              <div className="flex items-center justify-between px-5 pt-4 pb-3">
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold flex items-center gap-2 text-sm">
                    <Layers className="h-4 w-4 opacity-60" />
                    Tech Stack
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {isCollapsedTech
                      ? (techStacks.length === 0 ? 'Not set' : techStacks.slice(0, 4).join(', ') + (techStacks.length > 4 ? ` +${techStacks.length - 4} more` : ''))
                      : 'Technologies and tools you work with.'
                    }
                  </p>
                </div>
                <div className="flex items-center gap-0.5 shrink-0 ml-2">
                  {!isCollapsedTech && !isEditingTech && (
                    <Button variant="ghost" size="icon" onClick={() => { setEditTechStacks([...techStacks]); setIsEditingTech(true); setIsCollapsedTech(false) }} className="h-7 w-7 text-muted-foreground hover:text-foreground">
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" onClick={() => setIsCollapsedTech(!isCollapsedTech)} className="h-7 w-7 text-muted-foreground hover:text-foreground">
                    <ChevronDown className={cn('h-4 w-4 transition-transform duration-200', !isCollapsedTech && 'rotate-180')} />
                  </Button>
                </div>
              </div>
              {!isCollapsedTech && (
                <div className="px-5 pb-5">
                  {isEditingTech ? (
                    <div className="space-y-3 max-w-2xl">
                      <TechStackPicker value={editTechStacks} onChange={setEditTechStacks} />
                      <div className="flex gap-2 pt-1">
                        <Button onClick={handleSaveTechStacks} size="sm" className="gap-2">
                          <CheckCircle2 className="h-4 w-4" />
                          Save
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setIsEditingTech(false)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {techStacks.length === 0
                        ? <p className="text-sm text-muted-foreground italic">No tech stacks added yet.</p>
                        : techStacks.map((tech) => {
                            const meta = TECH_CATALOG.find((t) => t.name === tech)
                            const src = meta ? (meta.iconUrl ?? `https://cdn.simpleicons.org/${meta.slug}/${meta.color}`) : null
                            return meta ? (
                              <Badge key={tech} variant="secondary" className="gap-1.5 pl-2 pr-3 py-1 text-sm">
                                {src && <img src={src} alt={tech} width={14} height={14} className="w-3.5 h-3.5 object-contain shrink-0" />}
                                {tech}
                              </Badge>
                            ) : (
                              <Badge key={tech} variant="secondary" className="px-3 py-1 text-sm">{tech}</Badge>
                            )
                          })
                      }
                    </div>
                  )}
                </div>
              )}
            </div>

            <ExperienceBuilder experiences={experiences} onChange={setExperiences} flat />
            <ProjectsBuilder projects={projects} onChange={setProjects} flat />
            <EducationBuilder education={education} onChange={setEducation} flat />
            <CertificationsBuilder certifications={certifications} onChange={setCertifications} flat />
            <PortfolioSettingsCard settings={portfolioSettings} onChange={setPortfolioSettings} flat />
          </div>

          <GithubProfileWidget />
        </TabsContent>
      </Tabs>
    </div>
  )
}
