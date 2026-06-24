"use client";

import Link from "next/link";
import ThemeToggle from "@/app/components/ui/ThemeToggle";

import Image from "next/image";

export default function MarketingNav() {
  return (
    <nav className="fixed top-0 w-full bg-card/80 backdrop-blur-md border-b border-border z-50 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="relative h-8 w-8 overflow-hidden flex items-center justify-center">
            <Image src="/logo.png" alt="CareSync Logo" fill className="object-contain" />
          </div>
          <span className="text-xl font-bold text-foreground">CareSync</span>
        </Link>
        <div className="flex items-center gap-4 sm:gap-6">
          <Link href="#features" className="hidden sm:inline text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
            Features
          </Link>
          <Link href="/pricing" className="hidden sm:inline text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
            Pricing
          </Link>
          <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
            Log in
          </Link>
          <Link
            href="/signup"
            className="text-sm font-medium bg-primary text-primary-foreground px-4 py-2 rounded-full hover:bg-primary-dark transition-colors shadow-sm hover:shadow"
          >
            Start Free Trial
          </Link>
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}
