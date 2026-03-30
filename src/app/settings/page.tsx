'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Moon, Sun, Monitor, Globe, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import useAuth from '@/utils/useAuth'

export default function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const { user } = useAuth()
  const [mounted, setMounted] = useState(false)
  const [language, setLanguage] = useState('en')

  useEffect(() => {
    setMounted(true)
    // Here we'd typically load the language preference or read from standard browser APIs
  }, [])

  if (!mounted) {
    return null // Avoid hydration mismatch
  }

  const handleLanguageChange = (value: string) => {
    setLanguage(value)
    // Integrate true i18n/next-intl logic here in the future
    console.log(`Language changed to ${value}`)
  }

  return (
    <div className="flex-1 space-y-8 p-8 max-w-5xl mx-auto w-full pt-20 lg:pt-8 bg-background/50">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
          <p className="text-muted-foreground">Manage your account settings and preferences.</p>
        </div>
      </div>

      <div className="grid gap-6">
        <Card className="border shadow-sm bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 opacity-70" />
              User Profile
            </CardTitle>
            <CardDescription>
              Your personal information and account details.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {user ? (
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={user.photoURL || undefined} alt={user.displayName || 'User'} />
                  <AvatarFallback>{user.displayName?.charAt(0) || 'U'}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-xl font-medium">{user.displayName || 'Anonymous User'}</h3>
                  <p className="text-sm text-muted-foreground">{user.email || 'No email provided'}</p>
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                Not logged in.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border shadow-sm bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sun className="h-5 w-5 opacity-70" />
              Appearance
            </CardTitle>
            <CardDescription>
              Customize how the application looks on your device.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <Label>Theme Preference</Label>
              <div className="grid grid-cols-3 gap-4">
                <Button
                  variant="outline"
                  className={cn(
                    "h-24 flex-col gap-3 justify-center border-2 border-muted hover:border-primary/50 transition-all",
                    theme === 'light' && "border-primary bg-primary/5"
                  )}
                  onClick={() => setTheme('light')}
                >
                  <Sun className="h-6 w-6" />
                  <span>Light</span>
                </Button>
                <Button
                  variant="outline"
                  className={cn(
                    "h-24 flex-col gap-3 justify-center border-2 border-muted hover:border-primary/50 transition-all",
                    theme === 'dark' && "border-primary bg-primary/5"
                  )}
                  onClick={() => setTheme('dark')}
                >
                  <Moon className="h-6 w-6" />
                  <span>Dark</span>
                </Button>
                <Button
                  variant="outline"
                  className={cn(
                    "h-24 flex-col gap-3 justify-center border-2 border-muted hover:border-primary/50 transition-all",
                    theme === 'system' && "border-primary bg-primary/5"
                  )}
                  onClick={() => setTheme('system')}
                >
                  <Monitor className="h-6 w-6" />
                  <span>System</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 opacity-70" />
              Language
            </CardTitle>
            <CardDescription>
              Set the language format used across the platform.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4 max-w-xs">
              <Label>Select Language</Label>
              <Select value={language} onValueChange={handleLanguageChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a language" />
                </SelectTrigger>
                <SelectContent rounded-lg>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Español (Spanish)</SelectItem>
                  <SelectItem value="fr">Français (French)</SelectItem>
                  <SelectItem value="de">Deutsch (German)</SelectItem>
                  <SelectItem value="pt">Português (Portuguese)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">
              Changing your language will update application menus and labels to the selected format.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
