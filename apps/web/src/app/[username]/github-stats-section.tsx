'use client'

import { Github, Flame, Calendar, ChartBar, Code2 } from 'lucide-react'
import { useTheme } from 'next-themes'
import { GitHubCalendar } from 'react-github-calendar'

function StatImage({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="w-full" style={{ aspectRatio: '495 / 195' }}>
      <img
        src={src}
        alt={alt}
        width={495}
        height={195}
        className="w-full h-full object-contain pointer-events-none"
        loading="lazy"
      />
    </div>
  )
}

export function GithubStatsSection({ githubUsername }: { githubUsername: string }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <section className="w-full mt-14 space-y-5">
      <div className="flex items-center gap-2.5 mb-1">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
          <Github className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">GitHub Activity</h2>
          <p className="text-xs text-muted-foreground">Contributions, streaks, and language stats</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <div className="rounded-2xl border border-border/40 bg-card/30 backdrop-blur-md p-5 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="h-4 w-4 text-emerald-500" />
              <span className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                Contribution Graph
              </span>
            </div>
            <div className="w-full flex justify-center overflow-x-auto custom-scrollbar pb-1">
              <GitHubCalendar
                username={githubUsername}
                colorScheme={isDark ? 'dark' : 'light'}
                blockSize={12}
                blockMargin={3}
                fontSize={11}
                style={{ fontFamily: 'inherit' }}
              />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border/40 bg-card/30 backdrop-blur-md p-5 shadow-sm hover:shadow-md transition-shadow h-full">
          <div className="flex items-center gap-2 mb-4">
            <Flame className="h-4 w-4 text-orange-500" />
            <span className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">Streak</span>
          </div>
          <StatImage
            src={`https://github-readme-streak-stats.herokuapp.com/?user=${githubUsername}&theme=${isDark ? 'transparent&ring=40c463&fire=40c463&currStreakLabel=40c463&stroke=ffffff20&text=ccc&sideNums=ccc&sideLabels=ccc' : 'transparent&ring=40c463&fire=40c463&currStreakLabel=40c463&stroke=00000020&text=333&sideNums=333&sideLabels=333'}&hide_border=true&background=00000000`}
            alt={`${githubUsername}'s GitHub Streak`}
          />
        </div>

        <div className="rounded-2xl border border-border/40 bg-card/30 backdrop-blur-md p-5 shadow-sm hover:shadow-md transition-shadow h-full">
          <div className="flex items-center gap-2 mb-4">
            <ChartBar className="h-4 w-4 text-blue-500" />
            <span className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">Overview</span>
          </div>
          <StatImage
            src={`https://github-readme-stats.vercel.app/api?username=${githubUsername}&show_icons=true&theme=${isDark ? 'transparent&text_color=ccc&icon_color=40c463&title_color=fff' : 'transparent&text_color=333&icon_color=40c463&title_color=000'}&hide_border=true&bg_color=00000000&rank_icon=github`}
            alt="GitHub Stats"
          />
        </div>

        <div className="md:col-span-2">
          <div className="rounded-2xl border border-border/40 bg-card/30 backdrop-blur-md p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-4">
              <Code2 className="h-4 w-4 text-indigo-500" />
              <span className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                Top Languages
              </span>
            </div>
            <StatImage
              src={`https://github-readme-stats.vercel.app/api/top-langs/?username=${githubUsername}&layout=compact&theme=${isDark ? 'transparent&text_color=ccc&title_color=fff' : 'transparent&text_color=333&title_color=000'}&hide_border=true&bg_color=00000000&langs_count=10`}
              alt="Top Languages"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
