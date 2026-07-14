"use client"

import { motion } from "framer-motion"
import { IconCheck, IconRocket } from "@tabler/icons-react"
import { Badge } from "@/components/ui/badge"

export function WelcomeStep() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8 py-10 gap-6">
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 18 }}
        className="relative"
      >
        <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/20 flex items-center justify-center shadow-lg shadow-primary/10">
          <IconRocket className="w-12 h-12 text-primary" />
        </div>
        <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-green-500 border-2 border-background flex items-center justify-center">
          <IconCheck className="w-3 h-3 text-white" />
        </div>
      </motion.div>

      <motion.div
        initial={{ y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="space-y-3"
      >
        <h2 className="text-3xl font-bold tracking-tight">Welcome to mydevtools</h2>
        <p className="text-muted-foreground text-base max-w-md leading-relaxed">
          Your all-in-one developer toolkit. Let&apos;s take 30 seconds to personalise your sidebar and
          show you the highlights.
        </p>
      </motion.div>

      <motion.div
        initial={{ y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="flex flex-wrap justify-center gap-2"
      >
        {["60+ tools", "Synced across devices", "Works offline", "Privacy-first"].map((tag) => (
          <Badge key={tag} variant="secondary" className="text-xs px-3 py-1">
            {tag}
          </Badge>
        ))}
      </motion.div>
    </div>
  )
}
