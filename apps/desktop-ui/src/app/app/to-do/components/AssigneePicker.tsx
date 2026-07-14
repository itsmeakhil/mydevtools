"use client";

import React, { useState } from "react";
import { Check, UserCircle2, UserX } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  useWorkspaceMembers,
  memberLabel,
  memberInitials,
} from "@/app/app/to-do/hooks/useWorkspaceMembers";
import type { Member } from "@/app/app/to-do/hooks/useWorkspaceMembers";

const SIZES = {
  sm: { avatar: "h-6 w-6", text: "text-[10px]", icon: "h-4 w-4" },
  md: { avatar: "h-8 w-8", text: "text-xs", icon: "h-5 w-5" },
} as const;

/** Read-only avatar for an assignee uid (used in list rows / cards). */
export function AssigneeAvatar({
  member,
  size = "sm",
  className,
}: {
  member: Member | undefined | null;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const s = SIZES[size];
  if (!member) {
    return (
      <UserCircle2
        className={cn(s.icon, "text-muted-foreground/50", className)}
        aria-label="Unassigned"
      />
    );
  }
  return (
    <Avatar className={cn(s.avatar, className)}>
      <AvatarFallback className={cn(s.text, "bg-primary/10 text-primary font-medium")}>
        {memberInitials(member)}
      </AvatarFallback>
    </Avatar>
  );
}

interface AssigneePickerProps {
  assigneeUid?: string | null;
  // null = unassign. Emitted as null (not undefined) so the PATCH actually
  // clears the field — updateTask strips undefined keys but keeps null.
  onChange: (uid: string | null) => void | Promise<void>;
  disabled?: boolean;
  size?: keyof typeof SIZES;
}

/**
 * Assignee button + searchable member dropdown. Pulls from the active
 * workspace's members (Linear-style single assignee).
 */
export function AssigneePicker({
  assigneeUid,
  onChange,
  disabled,
  size = "sm",
}: AssigneePickerProps) {
  const [open, setOpen] = useState(false);
  const { members, isLoading, isShared } = useWorkspaceMembers();
  const current = members.find((m) => m.uid === assigneeUid);
  const s = SIZES[size];

  // Solo (personal workspace) has no one to assign to — hide the control unless
  // the task already carries an assignee (e.g. moved from a shared workspace).
  if (!isShared && !assigneeUid) return null;

  const select = async (uid: string | null) => {
    setOpen(false);
    if (uid !== (assigneeUid ?? null)) await onChange(uid);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled}
          onClick={(e) => e.stopPropagation()}
          className={cn("h-auto p-0.5 rounded-full hover:bg-muted", disabled && "cursor-default")}
          aria-label={current ? `Assigned to ${memberLabel(current)}` : "Assign"}
        >
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex">
                  <AssigneeAvatar member={current} size={size} />
                </span>
              </TooltipTrigger>
              <TooltipContent>
                {current ? memberLabel(current) : "Unassigned"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0" align="end" onClick={(e) => e.stopPropagation()}>
        <Command>
          <CommandInput placeholder="Assign to…" className={s.text} />
          <CommandList>
            <CommandEmpty>{isLoading ? "Loading…" : "No members found."}</CommandEmpty>
            <CommandGroup>
              <CommandItem value="unassigned" onSelect={() => select(null)}>
                <UserX className="mr-2 h-4 w-4 text-muted-foreground" />
                <span className="flex-1">Unassigned</span>
                {!assigneeUid && <Check className="h-4 w-4" />}
              </CommandItem>
              {members.map((m) => (
                <CommandItem
                  key={m.uid}
                  value={`${memberLabel(m)} ${m.uid}`}
                  onSelect={() => select(m.uid)}
                >
                  <Avatar className="mr-2 h-5 w-5">
                    <AvatarFallback className="text-[9px] bg-primary/10 text-primary font-medium">
                      {memberInitials(m)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="flex-1 truncate">{memberLabel(m)}</span>
                  {assigneeUid === m.uid && <Check className="h-4 w-4" />}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
