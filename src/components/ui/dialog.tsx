"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { cva } from "class-variance-authority"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

const dialogOverlayVariants = cva(
  "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=open]:fade-in"
)

const dialogContentVariants = cva(
  "fixed left-1/2 top-1/2 z-50 grid w-full max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 rounded-3xl border border-white/10 bg-white p-6 shadow-2xl shadow-black/10 duration-200 dark:bg-[#111111] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:zoom-out-95 data-[state=closed]:fade-out data-[state=open]:fade-in data-[state=open]:zoom-in-95"
)

const Dialog = DialogPrimitive.Root

const DialogTrigger = DialogPrimitive.Trigger

const DialogPortal = DialogPrimitive.Portal

const DialogClose = DialogPrimitive.Close

const DialogOverlay = DialogPrimitive.Overlay

const DialogContent = ({ className, children, ...props }: DialogPrimitive.DialogContentProps) => (
  <DialogPortal>
    <DialogOverlay className={dialogOverlayVariants()} />
    <DialogPrimitive.Content className={cn(dialogContentVariants(), className)} {...props}>
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 rounded-full p-1 text-[#6B7280] transition-colors hover:bg-black/5 hover:text-[#0B0B0B] focus:outline-none focus:ring-2 focus:ring-[var(--theme-color)] focus:ring-offset-2">
        <X className="size-4" aria-hidden="true" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
)
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-1.5 text-left", className)} {...props} />
)
DialogHeader.displayName = "DialogHeader"

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)} {...props} />
)
DialogFooter.displayName = "DialogFooter"

const DialogTitle = DialogPrimitive.Title

const DialogDescription = DialogPrimitive.Description

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}

