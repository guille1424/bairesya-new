import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({ className, priority }: { className?: string; priority?: boolean }) {
  return (
    <Image
      src="/logo.webp"
      alt="BairesYa"
      width={876}
      height={622}
      priority={priority}
      className={cn("h-auto dark:invert", className)}
    />
  );
}

export function BrandLink({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cn("flex items-center gap-2 font-semibold tracking-tight", className)}>
      <Logo className="w-10" />
      <span className="font-display text-2xl leading-none tracking-wide uppercase">
        Baires<span className="text-primary">Ya</span>
      </span>
    </Link>
  );
}
