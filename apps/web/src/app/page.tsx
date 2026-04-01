"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { BackgroundAnimation } from "@/components/ui/background-animation";
import useAuth from "@/utils/useAuth";
import {
  ArrowRight,
  Zap,
  Shield,
  Rocket,
  Sparkles,
  CheckCircle2,
  Code2,
  Lock,
  FileJson,
  KeyRound,
  Link as LinkIcon,
} from "lucide-react";

export default function Page() {
  const { user } = useAuth();
  const router = useRouter();

  const handleNavigation = () => {
    if (user) {
      router.push("/dashboard");
    } else {
      router.push("/login");
    }
  };

  const tools = [
    {
      title: "JSON Editor",
      description: "Format, validate, and minify JSON data with our powerful JSON tools.",
      icon: FileJson,
      href: "/app/json-formatter",
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
    },
    {
      title: "API Client",
      description: "Test and debug HTTP requests with our easy-to-use API client.",
      icon: LinkIcon,
      href: "/app/api-client",
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "NoSQL Explorer",
      description: "Explore and manage your MongoDB databases directly from your browser.",
      icon: KeyRound,
      href: "/app/nosql-explorer",
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
    {
      title: "Password Manager",
      description: "Securely store and manage your passwords with client-side encryption.",
      icon: Lock,
      href: "/app/password-manager",
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      title: "Task Manager",
      description: "Organize your daily tasks and boost your productivity.",
      icon: CheckCircle2,
      href: "/app/to-do",
      color: "text-red-500",
      bgColor: "bg-red-500/10",
    },
    {
      title: "Notes",
      description: "Capture ideas and organize your thoughts with our simple note-taking app.",
      icon: Code2,
      href: "/app/notes",
      color: "text-indigo-500",
      bgColor: "bg-indigo-500/10",
    },
  ];

  const features = [
    {
      icon: Zap,
      title: "Lightning Fast",
      description: "Optimized for speed with client-side processing. No server latency.",
    },
    {
      icon: Shield,
      title: "Secure & Private",
      description: "Your data never leaves your browser. 100% client-side execution.",
    },
    {
      icon: Rocket,
      title: "Developer First",
      description: "Built by developers, for developers. Clean APIs and intuitive UI.",
    },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-background font-sans">
      <Header />

      {/* Hero Section */}
      <section className="relative py-12 sm:py-16 md:py-24 lg:py-32 overflow-hidden">
        {/* OpenStatus-inspired Background */}
        <BackgroundAnimation />

        <div className="container px-4 md:px-6 mx-auto text-center">
          <div className="space-y-6 md:space-y-4 max-w-3xl mx-auto">
            <Badge variant="secondary" className="px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-medium rounded-full border border-primary/20 bg-primary/5 text-primary animate-in fade-in slide-in-from-bottom-4 duration-500">
              <Sparkles className="w-3 md:w-4 h-3 md:h-4 mr-1.5 md:mr-2 inline-block" />
              The Ultimate Developer Toolkit
            </Badge>

            <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight text-foreground animate-in fade-in slide-in-from-bottom-6 duration-700 leading-tight">
              Simplify Your <br className="hidden sm:block" />
              <span className="text-primary bg-clip-text">Development Workflow</span>
            </h1>

            <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-1000 px-2">
              Access a comprehensive suite of developer tools in one place.
              From formatters to generators, we've got everything you need to code faster.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 md:gap-4 pt-6 md:pt-8 animate-in fade-in slide-in-from-bottom-10 duration-1000 px-4 sm:px-0">
              <Button size="lg" className="h-12 md:h-12 px-6 md:px-8 text-sm md:text-base rounded-full w-full sm:w-auto touch-target" onClick={handleNavigation}>
                Get Started <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" className="h-12 md:h-12 px-6 md:px-8 text-sm md:text-base rounded-full w-full sm:w-auto touch-target" asChild>
                <Link href="https://github.com/itsmeakhil/mydevtools.tech" target="_blank">
                  View on GitHub
                </Link>
              </Button>
            </div>

            <div className="pt-8 md:pt-10 animate-in fade-in slide-in-from-bottom-12 duration-1000">
              <a href="https://www.producthunt.com/products/mydevtools?embed=true&utm_source=badge-featured&utm_medium=badge&utm_source=badge-mydevtools" target="_blank" className="inline-block hover:opacity-90 transition-opacity">
                <img
                  src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1041847&theme=light&t=1764002797983"
                  alt="MyDevTools - Essential tools for developers | Product Hunt"
                  style={{ width: '250px', height: '54px' }}
                  width="250"
                  height="54"
                />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-12 md:py-20 relative overflow-hidden">
        {/* Subtle background with dot pattern */}
        <div className="absolute inset-0 -z-10 bg-muted/30">
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: `radial-gradient(circle, hsl(var(--foreground) / 0.1) 1px, transparent 1px)`,
              backgroundSize: '32px 32px'
            }}
          />
        </div>

        <div className="container px-4 md:px-6 mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="border-none shadow-none bg-transparent">
                <CardHeader className="pb-3 md:pb-6 flex flex-row items-center gap-4">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <feature.icon className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg md:text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm md:text-base text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Tools Showcase */}
      <section id="features" className="py-16 md:py-24">
        <div className="container px-4 md:px-6 mx-auto">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold mb-3 md:mb-4">Popular Tools</h2>
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto px-4">
              Discover our most used utilities designed to boost your productivity.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {tools.map((tool, index) => (
              <Link key={index} href={tool.href}>
                <Card className="h-full hover:shadow-lg transition-all duration-300 hover:-translate-y-1 active:scale-[0.98] border-border/50 hover:border-primary/50 group cursor-pointer">
                  <CardHeader className="pb-3 md:pb-6 flex flex-row items-center gap-4">
                    <div className={`w-10 h-10 md:w-12 md:h-12 rounded-lg ${tool.bgColor} flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shrink-0`}>
                      <tool.icon className={`w-5 h-5 md:w-6 md:h-6 ${tool.color}`} />
                    </div>
                    <CardTitle className="text-lg md:text-xl group-hover:text-primary transition-colors">
                      {tool.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                      {tool.description}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          <div className="mt-8 md:mt-12 text-center">
            <Button variant="secondary" size="lg" className="rounded-full h-11 md:h-12 px-6 md:px-8 text-sm md:text-base" onClick={handleNavigation}>
              Explore All Tools <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24 bg-primary/5 relative overflow-hidden">
        <div className="container px-4 md:px-6 mx-auto text-center relative z-10">
          <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold mb-4 md:mb-6 px-2">Ready to Boost Your Productivity?</h2>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 md:mb-10 px-4">
            Join thousands of developers who use MyDevTools to streamline their daily tasks.
            Open source, free, and privacy-focused.
          </p>
          <Button size="lg" className="h-12 md:h-14 px-8 md:px-10 text-base md:text-lg rounded-full shadow-xl hover:shadow-2xl hover:scale-105 active:scale-[0.98] transition-all duration-300 w-full sm:w-auto max-w-sm sm:max-w-none touch-target" onClick={handleNavigation}>
            Start Using Tools Now
          </Button>
        </div>

        {/* OpenStatus-style Decorative Background - Optimized for mobile */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: `radial-gradient(circle, hsl(var(--foreground) / 0.1) 1px, transparent 1px)`,
              backgroundSize: '32px 32px'
            }}
          />
          <div className="absolute top-1/2 left-1/4 w-[400px] md:w-[700px] h-[400px] md:h-[700px] rounded-full bg-primary/25 blur-[100px] md:blur-[140px] animate-float" />
          <div className="absolute bottom-1/2 right-1/4 w-[350px] md:w-[600px] h-[350px] md:h-[600px] rounded-full bg-blue-500/20 blur-[90px] md:blur-[120px] animate-float-delayed" />
        </div>
      </section>

      <Footer />
    </div>
  );
}
