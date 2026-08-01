import { ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";

type InteractiveHoverButtonProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  children: React.ReactNode;
};

export function InteractiveHoverButton({
  href,
  children,
  className,
  target,
  rel,
  ...rest
}: InteractiveHoverButtonProps) {
  const externalRel = target === "_blank" ? "noopener noreferrer" : undefined;

  return (
    <a
      href={href}
      target={target}
      rel={rel ?? externalRel}
      className={cn(
        "group relative inline-flex w-full items-center justify-center overflow-hidden rounded-full border border-[var(--theme-color)]/70 bg-[var(--theme-color)] px-6 py-3 text-base font-semibold text-white shadow-[0_10px_30px_rgba(229,9,20,0.25)] transition-all duration-300 ease-out",
        "hover:-translate-y-0.5 hover:border-[var(--theme-color)] hover:bg-[var(--theme-color)] hover:shadow-[0_16px_40px_rgba(229,9,20,0.35)]",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-color)] focus-visible:ring-offset-2",
        "active:translate-y-0",
        className
      )}
      {...rest}
    >
      <span className="flex items-center gap-2 transition-all duration-300 group-hover:translate-x-8 group-hover:opacity-0">
        <span
          aria-hidden="true"
          className="size-2.5 rounded-full bg-white/70 transition-transform duration-300 group-hover:scale-150 group-hover:bg-white"
        />
        <span>{children}</span>
      </span>
      <span
        aria-hidden="true"
        className="absolute inset-0 flex translate-x-10 items-center justify-center gap-2 text-white opacity-0 transition-all duration-300 group-hover:-translate-x-3 group-hover:opacity-100"
      >
        <span>{children}</span>
        <ArrowRight className="size-4" />
      </span>
    </a>
  );
}


