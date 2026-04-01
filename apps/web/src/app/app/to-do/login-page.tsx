import type { Metadata } from "next"
import Link from "next/link"
import { FileJson, ListTodo, StickyNote, FileCode, Key, Hash } from "lucide-react"
import { Card } from "@/components/ui/card"
import { LoginForm } from "../../../components/login-form"

export const metadata: Metadata = {
  title: "Login - MyDevTools",
  description: "Login to access your developer tools and workspace",
}

export default function LoginPage() {
  return (
    <div className="container relative min-h-[calc(100vh-4rem)] flex-col items-center justify-center md:grid lg:max-w-none lg:grid-cols-2 lg:px-0">
      <div className="relative hidden h-full flex-col bg-muted/40 p-8 dark:bg-muted/10 lg:flex">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/80 to-background/40" />
        <div className="relative z-20 flex-grow flex flex-col justify-center">
          <div className="border border-border/50 rounded-lg p-6 bg-background/95 backdrop-blur-sm">
            <h2 className="text-3xl font-semibold mb-6">Essential Developer Tools</h2>
            <div className="grid grid-cols-2 gap-4">
              {[
                {
                  icon: ListTodo,
                  title: "To-Do App",
                  description: "Organize tasks",
                },
                {
                  icon: StickyNote,
                  title: "Note Taking",
                  description: "Capture ideas",
                },
                {
                  icon: FileJson,
                  title: "JSON/YAML Tools",
                  description: "Convert & format",
                },
                {
                  icon: FileCode,
                  title: "YAML to TOML",
                  description: "Easy conversion",
                },
                {
                  icon: Key,
                  title: "Bcrypt Generator",
                  description: "Secure hashing",
                },
                {
                  icon: Hash,
                  title: "UUID Generator",
                  description: "Unique identifiers",
                },
              ].map((tool, i) => (
                <Card
                  key={i}
                  className="p-4 bg-background/80 backdrop-blur-sm border-border/50 hover:border-foreground/20 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <tool.icon className="h-8 w-8 text-foreground/80" />
                    <div>
                      <p className="font-medium text-sm">{tool.title}</p>
                      <p className="text-xs text-muted-foreground">{tool.description}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
        <div className="relative z-20 mt-auto pt-8">
          <p className="text-sm text-muted-foreground">
            Streamline your development workflow with our comprehensive suite of tools.
          </p>
        </div>
      </div>
      <div className="lg:p-8">
        <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
          <div className="flex flex-col space-y-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
            <p className="text-sm text-muted-foreground">Sign in to your account to continue</p>
          </div>
          <LoginForm />
          <p className="px-8 text-center text-sm text-muted-foreground">
            By continuing, you agree to our{" "}
            <Link href="/terms" className="underline underline-offset-4 hover:text-foreground transition-colors">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="underline underline-offset-4 hover:text-foreground transition-colors">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  )
}

