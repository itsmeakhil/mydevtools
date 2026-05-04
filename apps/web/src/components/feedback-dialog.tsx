"use client";

import React, { useState } from "react";
import { MessageSquarePlus, X, Loader2, CheckCircle2, Star } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import useAuth from "@/utils/useAuth";
import { usePathname } from "next/navigation";

type FeedbackType = "bug" | "feature" | "general";

const TYPES: { value: FeedbackType; label: string; emoji: string }[] = [
  { value: "bug", label: "Bug report", emoji: "🐛" },
  { value: "feature", label: "Feature request", emoji: "✨" },
  { value: "general", label: "General", emoji: "💬" },
];

async function submitFeedback(payload: {
  type: FeedbackType;
  message: string;
  rating: number | null;
  email: string | null;
  page: string;
}) {
  const res = await fetch("/api/backend/feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.detail ?? "Failed to submit feedback");
  }
  return res.json();
}

function StarRating({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = (hovered ?? value ?? 0) >= n;
        return (
          <button
            key={n}
            type="button"
            onClick={() => onChange(value === n ? null : n)}
            onMouseEnter={() => setHovered(n)}
            onMouseLeave={() => setHovered(null)}
            className="p-0.5 transition-transform hover:scale-110 active:scale-95"
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
          >
            <Star
              className={cn(
                "w-5 h-5 transition-colors",
                filled ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"
              )}
            />
          </button>
        );
      })}
    </div>
  );
}

export function FeedbackDialog() {
  const { user } = useAuth(false);
  const pathname = usePathname();

  const [open, setOpen] = useState(false);
  const [type, setType] = useState<FeedbackType>("general");
  const [message, setMessage] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  function reset() {
    setType("general");
    setMessage("");
    setRating(null);
    setStatus("idle");
    setErrorMsg("");
  }

  function handleClose(v: boolean) {
    if (!v) {
      setOpen(false);
      if (status === "success") reset();
    } else {
      setOpen(true);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (message.trim().length < 10) {
      setErrorMsg("Message must be at least 10 characters.");
      return;
    }
    setStatus("loading");
    setErrorMsg("");
    try {
      await submitFeedback({
        type,
        message: message.trim(),
        rating,
        email: user?.email ?? null,
        page: pathname,
      });
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  return (
    <>
      {/* Floating trigger button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-50 inline-flex items-center gap-2 h-10 px-4 rounded-full shadow-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 hover:scale-105 active:scale-95 transition-all duration-200"
        aria-label="Give feedback"
      >
        <MessageSquarePlus className="w-4 h-4 shrink-0" />
        <span className="hidden sm:inline">Feedback</span>
      </button>

      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquarePlus className="w-4 h-4 text-primary" />
              Share your feedback
            </DialogTitle>
          </DialogHeader>

          {status === "success" ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-500" />
              <p className="font-semibold">Thanks for the feedback!</p>
              <p className="text-sm text-muted-foreground">We read every submission.</p>
              <Button
                variant="outline"
                className="mt-2 rounded-full"
                onClick={() => { reset(); setOpen(false); }}
              >
                Close
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Type selector */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Type
                </Label>
                <div className="flex gap-2 flex-wrap">
                  {TYPES.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setType(t.value)}
                      className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-all",
                        type === t.value
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border/60 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                      )}
                    >
                      <span>{t.emoji}</span>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Message */}
              <div className="space-y-2">
                <Label htmlFor="fb-message" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Message
                </Label>
                <Textarea
                  id="fb-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={
                    type === "bug"
                      ? "Describe what happened and how to reproduce it…"
                      : type === "feature"
                      ? "What would you like to see added or improved?"
                      : "Tell us anything on your mind…"
                  }
                  rows={4}
                  maxLength={2000}
                  className="resize-none"
                  required
                />
                <div className="flex justify-between text-xs">
                  <span className={cn(message.length > 0 && message.trim().length < 10 ? "text-destructive" : "text-muted-foreground")}>
                    Min. 10 characters
                  </span>
                  <span className="text-muted-foreground">{message.length}/2000</span>
                </div>
              </div>

              {/* Rating */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Rating <span className="normal-case text-muted-foreground/60">(optional)</span>
                </Label>
                <StarRating value={rating} onChange={setRating} />
              </div>

              {errorMsg && (
                <p className="text-sm text-destructive">{errorMsg}</p>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  className="rounded-full"
                  onClick={() => setOpen(false)}
                  disabled={status === "loading"}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="rounded-full"
                  disabled={status === "loading" || message.trim().length < 10}
                >
                  {status === "loading" ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending…</>
                  ) : (
                    "Send feedback"
                  )}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
