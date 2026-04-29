'use client'

import React, { useState, useMemo } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { X, ChevronDown, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

const DI = (name: string, variant = 'original') =>
  `https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/${name}/${name}-${variant}.svg`

export type TechItem = { name: string; slug: string; color: string; category: string; iconUrl?: string }

export const TECH_CATALOG: TechItem[] = [
  // Languages
  { name: 'JavaScript', slug: 'javascript', color: 'F7DF1E', category: 'Languages' },
  { name: 'TypeScript', slug: 'typescript', color: '3178C6', category: 'Languages' },
  { name: 'Python', slug: 'python', color: '3776AB', category: 'Languages' },
  { name: 'Go', slug: 'go', color: '00ADD8', category: 'Languages' },
  { name: 'Java', slug: 'openjdk', color: 'ED8B00', category: 'Languages' },
  { name: 'C#', slug: 'dotnet', color: '512BD4', category: 'Languages' },
  { name: 'C++', slug: 'cplusplus', color: '00599C', category: 'Languages' },
  { name: 'Ruby', slug: 'ruby', color: 'CC342D', category: 'Languages' },
  { name: 'PHP', slug: 'php', color: '777BB4', category: 'Languages' },
  { name: 'Swift', slug: 'swift', color: 'F05138', category: 'Languages' },
  { name: 'Kotlin', slug: 'kotlin', color: '7F52FF', category: 'Languages' },
  { name: 'Dart', slug: 'dart', color: '0175C2', category: 'Languages' },
  { name: 'Scala', slug: 'scala', color: 'DC322F', category: 'Languages' },
  { name: 'Elixir', slug: 'elixir', color: '4B275F', category: 'Languages' },
  { name: 'Haskell', slug: 'haskell', color: '5D4F85', category: 'Languages' },
  { name: 'Lua', slug: 'lua', color: '2C2D72', category: 'Languages' },
  { name: 'R', slug: 'r', color: '276DC3', category: 'Languages' },
  { name: 'Zig', slug: 'zig', color: 'F7A41D', category: 'Languages' },
  { name: 'Clojure', slug: 'clojure', color: '5881D8', category: 'Languages' },
  // Frontend
  { name: 'React', slug: 'react', color: '61DAFB', category: 'Frontend' },
  { name: 'Next.js', slug: 'nextdotjs', color: '000000', category: 'Frontend' },
  { name: 'Vue.js', slug: 'vuedotjs', color: '4FC08D', category: 'Frontend' },
  { name: 'Nuxt.js', slug: 'nuxt', color: '00DC82', category: 'Frontend' },
  { name: 'Angular', slug: 'angular', color: 'DD0031', category: 'Frontend' },
  { name: 'Svelte', slug: 'svelte', color: 'FF3E00', category: 'Frontend' },
  { name: 'SolidJS', slug: 'solid', color: '2C4F7C', category: 'Frontend' },
  { name: 'Astro', slug: 'astro', color: 'FF5D01', category: 'Frontend' },
  { name: 'Remix', slug: 'remix', color: '000000', category: 'Frontend' },
  { name: 'Tailwind CSS', slug: 'tailwindcss', color: '06B6D4', category: 'Frontend' },
  { name: 'Sass', slug: 'sass', color: 'CC6699', category: 'Frontend' },
  { name: 'Three.js', slug: 'threedotjs', color: '000000', category: 'Frontend' },
  { name: 'Vite', slug: 'vite', color: '646CFF', category: 'Frontend' },
  { name: 'Webpack', slug: 'webpack', color: '8DD6F9', category: 'Frontend' },
  { name: 'Redux', slug: 'redux', color: '764ABC', category: 'Frontend' },
  { name: 'Storybook', slug: 'storybook', color: 'FF4785', category: 'Frontend' },
  // Backend
  { name: 'Node.js', slug: 'nodedotjs', color: '5FA04E', category: 'Backend' },
  { name: 'Express', slug: 'express', color: '000000', category: 'Backend' },
  { name: 'FastAPI', slug: 'fastapi', color: '009688', category: 'Backend' },
  { name: 'Django', slug: 'django', color: '092E20', category: 'Backend' },
  { name: 'Flask', slug: 'flask', color: '000000', category: 'Backend' },
  { name: 'Spring Boot', slug: 'springboot', color: '6DB33F', category: 'Backend' },
  { name: 'Laravel', slug: 'laravel', color: 'FF2D20', category: 'Backend' },
  { name: 'Rails', slug: 'rubyonrails', color: 'D30001', category: 'Backend' },
  { name: 'NestJS', slug: 'nestjs', color: 'E0234E', category: 'Backend' },
  { name: 'GraphQL', slug: 'graphql', color: 'E10098', category: 'Backend' },
  { name: 'tRPC', slug: 'trpc', color: '2596BE', category: 'Backend' },
  { name: 'Bun', slug: 'bun', color: 'FBF0DF', category: 'Backend' },
  { name: 'Deno', slug: 'deno', color: '70FFAF', category: 'Backend' },
  { name: 'Hono', slug: 'hono', color: 'E36002', category: 'Backend' },
  { name: 'Gin', slug: 'gin', color: '00ADD8', category: 'Backend' },
  { name: 'Echo', slug: 'go', color: '00ADD8', category: 'Backend' },
  { name: 'Fiber', slug: 'go', color: '00ADD8', category: 'Backend' },
  { name: 'Actix Web', slug: 'actix', color: 'CE422B', category: 'Backend' },
  { name: 'Axum', slug: 'rust', color: 'CE422B', category: 'Backend' },
  { name: 'Phoenix', slug: 'phoenixframework', color: 'FD4F00', category: 'Backend' },
  { name: 'Ktor', slug: 'ktor', color: '087CFA', category: 'Backend' },
  { name: 'Quarkus', slug: 'quarkus', color: '4695EB', category: 'Backend' },
  { name: 'Micronaut', slug: 'micronaut', color: '2EA97F', category: 'Backend' },
  { name: 'ASP.NET Core', slug: 'dotnet', color: '512BD4', category: 'Backend' },
  { name: 'gRPC', slug: 'grpc', color: '244C5A', category: 'Backend', iconUrl: DI('grpc') },
  { name: 'REST API', slug: 'openapiinitiative', color: '6BA539', category: 'Backend' },
  { name: 'WebSockets', slug: 'socketdotio', color: '010101', category: 'Backend' },
  { name: 'Celery', slug: 'celery', color: '37814A', category: 'Backend' },
  { name: 'Sidekiq', slug: 'sidekiq', color: 'B1003E', category: 'Backend' },
  // Mobile
  { name: 'React Native', slug: 'react', color: '61DAFB', category: 'Mobile' },
  { name: 'Flutter', slug: 'flutter', color: '02569B', category: 'Mobile' },
  { name: 'Expo', slug: 'expo', color: '000020', category: 'Mobile' },
  { name: 'Ionic', slug: 'ionic', color: '3880FF', category: 'Mobile' },
  // Databases
  { name: 'PostgreSQL', slug: 'postgresql', color: '4169E1', category: 'Databases' },
  { name: 'MySQL', slug: 'mysql', color: '4479A1', category: 'Databases' },
  { name: 'MongoDB', slug: 'mongodb', color: '47A248', category: 'Databases' },
  { name: 'Redis', slug: 'redis', color: 'FF4438', category: 'Databases' },
  { name: 'SQLite', slug: 'sqlite', color: '003B57', category: 'Databases' },
  { name: 'Supabase', slug: 'supabase', color: '3FCF8E', category: 'Databases' },
  { name: 'Firebase', slug: 'firebase', color: 'DD2C00', category: 'Databases' },
  { name: 'Prisma', slug: 'prisma', color: '2D3748', category: 'Databases' },
  { name: 'Drizzle', slug: 'drizzle', color: 'C5F74F', category: 'Databases' },
  { name: 'Elasticsearch', slug: 'elasticsearch', color: '005571', category: 'Databases' },
  { name: 'Cassandra', slug: 'apachecassandra', color: '1287B1', category: 'Databases' },
  { name: 'Neo4j', slug: 'neo4j', color: '4581C3', category: 'Databases' },
  { name: 'CockroachDB', slug: 'cockroachlabs', color: '6933FF', category: 'Databases' },
  { name: 'PlanetScale', slug: 'planetscale', color: '000000', category: 'Databases' },
  { name: 'Neon', slug: 'neon', color: '00E599', category: 'Databases' },
  { name: 'DynamoDB', slug: 'amazondynamodb', color: '4053D6', category: 'Databases', iconUrl: DI('dynamodb') },
  { name: 'InfluxDB', slug: 'influxdb', color: '22ADF6', category: 'Databases' },
  { name: 'Turso', slug: 'turso', color: '4FF8D2', category: 'Databases' },
  { name: 'Convex', slug: 'convex', color: 'F3A823', category: 'Databases' },
  { name: 'Upstash', slug: 'upstash', color: '00E9A3', category: 'Databases' },
  { name: 'Pinecone', slug: 'pinecone', color: '000000', category: 'Databases' },
  { name: 'Qdrant', slug: 'qdrant', color: 'FF4438', category: 'Databases' },
  { name: 'MinIO', slug: 'minio', color: 'C72E49', category: 'Databases' },
  // Cloud & DevOps
  { name: 'AWS', slug: 'amazonwebservices', color: 'FF9900', category: 'Cloud & DevOps', iconUrl: DI('amazonwebservices', 'plain-wordmark') },
  { name: 'Google Cloud', slug: 'googlecloud', color: '4285F4', category: 'Cloud & DevOps' },
  { name: 'Azure', slug: 'microsoftazure', color: '0078D4', category: 'Cloud & DevOps', iconUrl: DI('azure') },
  { name: 'Docker', slug: 'docker', color: '2496ED', category: 'Cloud & DevOps' },
  { name: 'Kubernetes', slug: 'kubernetes', color: '326CE5', category: 'Cloud & DevOps' },
  { name: 'Terraform', slug: 'terraform', color: '844FBA', category: 'Cloud & DevOps' },
  { name: 'GitHub Actions', slug: 'githubactions', color: '2088FF', category: 'Cloud & DevOps' },
  { name: 'Vercel', slug: 'vercel', color: '000000', category: 'Cloud & DevOps' },
  { name: 'Netlify', slug: 'netlify', color: '00C7B7', category: 'Cloud & DevOps' },
  { name: 'Cloudflare', slug: 'cloudflare', color: 'F48120', category: 'Cloud & DevOps' },
  { name: 'Nginx', slug: 'nginx', color: '009639', category: 'Cloud & DevOps' },
  { name: 'Ansible', slug: 'ansible', color: 'EE0000', category: 'Cloud & DevOps' },
  { name: 'Pulumi', slug: 'pulumi', color: '8A3391', category: 'Cloud & DevOps' },
  { name: 'Fly.io', slug: 'flydotio', color: '7B3BE2', category: 'Cloud & DevOps' },
  { name: 'Railway', slug: 'railway', color: '0B0D0E', category: 'Cloud & DevOps' },
  { name: 'DigitalOcean', slug: 'digitalocean', color: '0080FF', category: 'Cloud & DevOps' },
  { name: 'Heroku', slug: 'heroku', color: '430098', category: 'Cloud & DevOps', iconUrl: DI('heroku') },
  { name: 'Hetzner', slug: 'hetzner', color: 'D50C2D', category: 'Cloud & DevOps' },
  { name: 'Linode / Akamai', slug: 'akamai', color: '0096D6', category: 'Cloud & DevOps' },
  { name: 'CircleCI', slug: 'circleci', color: '343434', category: 'Cloud & DevOps' },
  { name: 'Jenkins', slug: 'jenkins', color: 'D24939', category: 'Cloud & DevOps' },
  { name: 'GitLab CI', slug: 'gitlab', color: 'FC6D26', category: 'Cloud & DevOps' },
  { name: 'ArgoCD', slug: 'argo', color: 'EF7B4D', category: 'Cloud & DevOps' },
  { name: 'Helm', slug: 'helm', color: '0F1689', category: 'Cloud & DevOps' },
  { name: 'Prometheus', slug: 'prometheus', color: 'E6522C', category: 'Cloud & DevOps' },
  { name: 'Grafana', slug: 'grafana', color: 'F46800', category: 'Cloud & DevOps' },
  { name: 'Datadog', slug: 'datadog', color: '632CA6', category: 'Cloud & DevOps' },
  { name: 'Sentry', slug: 'sentry', color: '362D59', category: 'Cloud & DevOps' },
  { name: 'Traefik', slug: 'traefikproxy', color: '24A1C1', category: 'Cloud & DevOps' },
  { name: 'Caddy', slug: 'caddy', color: '1F88C0', category: 'Cloud & DevOps' },
  // Messaging & Streaming
  { name: 'Apache Kafka', slug: 'apachekafka', color: '231F20', category: 'Messaging' },
  { name: 'RabbitMQ', slug: 'rabbitmq', color: 'FF6600', category: 'Messaging' },
  { name: 'NATS', slug: 'nats', color: '27AAE1', category: 'Messaging', iconUrl: DI('nats') },
  { name: 'Apache Pulsar', slug: 'apachepulsar', color: '188FFF', category: 'Messaging' },
  { name: 'AWS SQS', slug: 'awssqs', color: 'FF4F8B', category: 'Messaging' },
  { name: 'AWS SNS', slug: 'awssns', color: 'FF4F8B', category: 'Messaging' },
  { name: 'Redis Pub/Sub', slug: 'redis', color: 'FF4438', category: 'Messaging' },
  { name: 'Temporal', slug: 'temporal', color: '141414', category: 'Messaging' },
  // AI / ML
  { name: 'TensorFlow', slug: 'tensorflow', color: 'FF6F00', category: 'AI & ML' },
  { name: 'PyTorch', slug: 'pytorch', color: 'EE4C2C', category: 'AI & ML' },
  { name: 'OpenAI', slug: 'openai', color: '412991', category: 'AI & ML' },
  { name: 'Hugging Face', slug: 'huggingface', color: 'FFD21E', category: 'AI & ML' },
  { name: 'LangChain', slug: 'langchain', color: '1C3C3C', category: 'AI & ML' },
  { name: 'Ollama', slug: 'ollama', color: '000000', category: 'AI & ML' },
  // Testing
  { name: 'Jest', slug: 'jest', color: 'C21325', category: 'Testing' },
  { name: 'Vitest', slug: 'vitest', color: '6E9F18', category: 'Testing' },
  { name: 'Playwright', slug: 'playwright', color: '2EAD33', category: 'Testing', iconUrl: DI('playwright') },
  { name: 'Cypress', slug: 'cypress', color: '69D3A7', category: 'Testing' },
  // Tools & Other
  { name: 'Git', slug: 'git', color: 'F05032', category: 'Tools' },
  { name: 'Linux', slug: 'linux', color: 'FCC624', category: 'Tools' },
  { name: 'Neovim', slug: 'neovim', color: '57A143', category: 'Tools' },
  { name: 'VS Code', slug: 'visualstudiocode', color: '007ACC', category: 'Tools', iconUrl: DI('vscode') },
  { name: 'Stripe', slug: 'stripe', color: '635BFF', category: 'Tools' },
  { name: 'Shopify', slug: 'shopify', color: '7AB55C', category: 'Tools' },
  { name: 'WordPress', slug: 'wordpress', color: '21759B', category: 'Tools' },
  { name: 'Figma', slug: 'figma', color: 'F24E1E', category: 'Tools' },
  { name: 'WebAssembly', slug: 'webassembly', color: '654FF0', category: 'Tools' },
  { name: 'Electron', slug: 'electron', color: '47848F', category: 'Tools' },
  { name: 'Tauri', slug: 'tauri', color: '24C8D8', category: 'Tools' },
  { name: 'pnpm', slug: 'pnpm', color: 'F69220', category: 'Tools' },
  { name: 'Turborepo', slug: 'turborepo', color: 'EF4444', category: 'Tools' },
  { name: 'Nx', slug: 'nx', color: '143055', category: 'Tools' },
  { name: 'Lerna', slug: 'lerna', color: 'CC00FF', category: 'Tools' },
  { name: 'ESLint', slug: 'eslint', color: '4B32C3', category: 'Tools' },
  { name: 'Prettier', slug: 'prettier', color: 'F7B93E', category: 'Tools' },
  { name: 'Swagger', slug: 'swagger', color: '85EA2D', category: 'Tools' },
  { name: 'Postman', slug: 'postman', color: 'FF6C37', category: 'Tools' },
  { name: 'Jira', slug: 'jira', color: '0052CC', category: 'Tools' },
  { name: 'Linear', slug: 'linear', color: '5E6AD2', category: 'Tools' },
  { name: 'Notion', slug: 'notion', color: '000000', category: 'Tools' },
  // Architecture Patterns
  { name: 'Microservices', slug: 'microservices', color: '6366F1', category: 'Architecture' },
  { name: 'Monolith', slug: 'monolith', color: '64748B', category: 'Architecture' },
  { name: 'Serverless', slug: 'serverless', color: 'FD5750', category: 'Architecture' },
  { name: 'Event-Driven', slug: 'eventdriven', color: 'F59E0B', category: 'Architecture' },
  { name: 'Event Sourcing', slug: 'eventsourcing', color: 'D97706', category: 'Architecture' },
  { name: 'CQRS', slug: 'cqrs', color: '7C3AED', category: 'Architecture' },
  { name: 'Domain-Driven Design', slug: 'ddd', color: '059669', category: 'Architecture' },
  { name: 'Hexagonal Architecture', slug: 'hexagonal', color: '0891B2', category: 'Architecture' },
  { name: 'Clean Architecture', slug: 'clean', color: '16A34A', category: 'Architecture' },
  { name: 'BFF', slug: 'bff', color: 'EA580C', category: 'Architecture' },
  { name: 'API Gateway', slug: 'apigateway', color: 'EC4899', category: 'Architecture' },
  { name: 'Service Mesh', slug: 'servicemesh', color: '2563EB', category: 'Architecture' },
  { name: 'Strangler Fig', slug: 'stranglerfig', color: '84CC16', category: 'Architecture' },
  { name: 'SAGA Pattern', slug: 'saga', color: 'F43F5E', category: 'Architecture' },
  { name: 'Outbox Pattern', slug: 'outbox', color: '8B5CF6', category: 'Architecture' },
  // Design Patterns
  { name: 'MVC', slug: 'mvc', color: '3B82F6', category: 'Design Patterns' },
  { name: 'MVVM', slug: 'mvvm', color: '8B5CF6', category: 'Design Patterns' },
  { name: 'Repository Pattern', slug: 'repository', color: '10B981', category: 'Design Patterns' },
  { name: 'Observer Pattern', slug: 'observer', color: 'F59E0B', category: 'Design Patterns' },
  { name: 'Factory Pattern', slug: 'factory', color: 'EF4444', category: 'Design Patterns' },
  { name: 'Singleton', slug: 'singleton', color: '6B7280', category: 'Design Patterns' },
  { name: 'Strategy Pattern', slug: 'strategy', color: '0EA5E9', category: 'Design Patterns' },
  { name: 'Decorator Pattern', slug: 'decorator', color: 'F97316', category: 'Design Patterns' },
  { name: 'Adapter Pattern', slug: 'adapter', color: '14B8A6', category: 'Design Patterns' },
  { name: 'Dependency Injection', slug: 'di', color: 'A855F7', category: 'Design Patterns' },
  { name: 'Pub/Sub', slug: 'pubsub', color: 'EC4899', category: 'Design Patterns' },
  { name: 'Circuit Breaker', slug: 'circuitbreaker', color: 'DC2626', category: 'Design Patterns' },
]

function TechIcon({ slug, color, name, iconUrl }: { slug: string; color: string; name: string; iconUrl?: string }) {
  const [errored, setErrored] = useState(false)
  if (errored) {
    return (
      <span
        className="w-4 h-4 rounded-sm shrink-0 flex items-center justify-center text-[9px] font-bold text-white"
        style={{ backgroundColor: `#${color}` }}
      >
        {name[0]}
      </span>
    )
  }
  const src = iconUrl ?? `https://cdn.simpleicons.org/${slug}/${color}`
  return (
    <img
      src={src}
      alt={name}
      width={16}
      height={16}
      className="w-4 h-4 shrink-0 object-contain"
      onError={() => setErrored(true)}
      loading="lazy"
    />
  )
}

interface TechStackPickerProps {
  value: string[]
  onChange: (value: string[]) => void
  className?: string
}

export function TechStackPicker({ value, onChange, className }: TechStackPickerProps) {
  const [open, setOpen] = useState(false)

  const grouped = useMemo(() => {
    const map = new Map<string, TechItem[]>()
    for (const item of TECH_CATALOG) {
      if (!map.has(item.category)) map.set(item.category, [])
      map.get(item.category)!.push(item)
    }
    return map
  }, [])

  const selectedItems = useMemo(
    () => TECH_CATALOG.filter((t) => value.includes(t.name)),
    [value],
  )

  const toggle = (name: string) => {
    if (value.includes(name)) {
      onChange(value.filter((v) => v !== name))
    } else {
      onChange([...value, name])
    }
  }

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {/* Selected chips */}
      {selectedItems.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedItems.map((tech) => (
            <Badge
              key={tech.name}
              variant="secondary"
              className="gap-1.5 pl-2 pr-1.5 py-1 text-xs font-medium"
            >
              <TechIcon slug={tech.slug} color={tech.color} name={tech.name} iconUrl={tech.iconUrl} />
              {tech.name}
              <button
                onClick={() => toggle(tech.name)}
                className="rounded-full hover:bg-muted-foreground/20 p-0.5 transition-colors ml-0.5"
                type="button"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Picker trigger */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal text-muted-foreground h-9"
            type="button"
          >
            {value.length === 0
              ? 'Search and add technologies…'
              : `${value.length} selected — add more`}
            <ChevronDown className="h-4 w-4 opacity-50 shrink-0 ml-2" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[420px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search tech, frameworks, tools…" className="h-9" />
            <CommandList className="max-h-72 overflow-y-auto">
              <CommandEmpty>No results found.</CommandEmpty>
              {Array.from(grouped.entries()).map(([category, items]) => (
                <CommandGroup key={category} heading={category}>
                  {items.map((tech) => {
                    const selected = value.includes(tech.name)
                    return (
                      <CommandItem
                        key={tech.name}
                        value={tech.name}
                        onSelect={() => toggle(tech.name)}
                        className="flex items-center gap-2.5 cursor-pointer"
                      >
                        <TechIcon slug={tech.slug} color={tech.color} name={tech.name} iconUrl={tech.iconUrl} />
                        <span className="flex-1 text-sm">{tech.name}</span>
                        {selected && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}
