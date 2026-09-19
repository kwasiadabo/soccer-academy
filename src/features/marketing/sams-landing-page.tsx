import "@fontsource/anton"
import { Link } from "react-router-dom"
import { motion, useReducedMotion } from "framer-motion"
import {
  ArrowRight,
  Check,
  ClipboardList,
  CreditCard,
  ShoppingBag,
  Trophy,
  Menu,
  X,
} from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { SamsMark } from "@/design-system/sams-mark"
import { SamsSignupDialog } from "./sams-signup-dialog"
import { usePublicPricing } from "./sams-pricing-api"

const FEATURES = [
  {
    icon: ClipboardList,
    label: "Registration",
    description: "Auto-generated player IDs, digital guardian records, and a real approval workflow from first form to active roster.",
  },
  {
    icon: CreditCard,
    label: "Finance",
    description: "Invoices, part-payments, receipts, and monthly billing — reconciled to the pesewa, not the exercise book.",
  },
  {
    icon: Trophy,
    label: "Training & Matches",
    description: "Coach-approved training plans, session attendance, and match-day ratings recorded pitch-side.",
  },
  {
    icon: ShoppingBag,
    label: "Kit Shop",
    description: "An in-academy store for jerseys and merchandise — stock, orders, and payment status in one place.",
  },
]

const STATS = [
  { value: "6", label: "role-based logins, one shared record" },
  { value: "GH₵", label: "fees tracked to the pesewa" },
  { value: "1", label: "player file, first trial to today" },
  { value: "0", label: "forms lost to a misplaced exercise book" },
]

const PRICING_INCLUDES = [
  "SMS to every parent, for every payment, session and reminder",
  "Email communications, branded to your academy",
  "Hosting for your academy's own SAMS portal",
  "Ongoing support and maintenance",
]

function NavLinks({ className = "" }: { className?: string }) {
  return (
    <nav aria-label="Primary" className={className}>
      <a href="#features" className="text-sm font-medium text-white/70 hover:text-white">
        Features
      </a>
      <a href="#why-sams" className="text-sm font-medium text-white/70 hover:text-white">
        Why SAMS
      </a>
      <a href="#pricing" className="text-sm font-medium text-white/70 hover:text-white">
        Pricing
      </a>
      <a href="#contact" className="text-sm font-medium text-white/70 hover:text-white">
        Contact
      </a>
    </nav>
  )
}

export function SamsLandingPage() {
  const reduceMotion = useReducedMotion()
  const [mobileOpen, setMobileOpen] = useState(false)
  const { data: pricing } = usePublicPricing()
  const pricePerPlayer = pricing?.pricePerPlayer ?? 20
  const signupFee = pricing?.signupFee ?? 0

  return (
    <div className="min-h-dvh overflow-x-hidden bg-[#0B0F0A] text-white">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0B0F0A]/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <SamsMark />
            <span className="text-base font-bold tracking-tight">SAMS</span>
          </div>

          <NavLinks className="hidden items-center gap-7 md:flex" />

          <div className="hidden items-center gap-3 md:flex">
            <Button asChild variant="ghost" size="sm" className="text-white hover:bg-white/10 hover:text-white">
              <Link to="/login">Sign in</Link>
            </Button>
            <Button asChild size="sm" className="bg-lime-400 text-[#0B0F0A] hover:bg-lime-300">
              <Link to="/signup">Sign up</Link>
            </Button>
          </div>

          <button
            type="button"
            className="text-white md:hidden"
            aria-label="Toggle menu"
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>

        {mobileOpen ? (
          <div className="border-t border-white/10 px-4 py-4 md:hidden">
            <NavLinks className="flex flex-col gap-4" />
            <div className="mt-4 flex flex-col gap-2">
              <Button asChild variant="ghost" size="sm" className="text-white hover:bg-white/10 hover:text-white">
                <Link to="/login">Sign in</Link>
              </Button>
              <Button asChild size="sm" className="bg-lime-400 text-[#0B0F0A] hover:bg-lime-300">
                <Link to="/signup">Sign up</Link>
              </Button>
            </div>
          </div>
        ) : null}
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -top-32 -right-32 size-[36rem] rounded-full bg-lime-400/10 blur-3xl" />
          <div className="absolute top-1/3 -left-20 size-72 rounded-full bg-lime-400/5 blur-3xl" />
          <svg className="absolute top-0 right-0 h-full w-1/2 opacity-[0.06]" viewBox="0 0 400 800" fill="none">
            {Array.from({ length: 8 }).map((_, i) => (
              <path
                key={i}
                d={`M ${420 - i * 45} 0 L ${380 - i * 45} 0 L ${180 - i * 45} 800 L ${220 - i * 45} 800 Z`}
                fill="white"
              />
            ))}
          </svg>
        </div>

        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
          <motion.span
            initial={reduceMotion ? undefined : { opacity: 0, y: 8 }}
            animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="inline-flex items-center gap-1.5 rounded-full border border-lime-400/30 bg-lime-400/10 px-3 py-1 text-xs font-semibold tracking-wide text-lime-300 uppercase"
          >
            Soccer Academy Management System
          </motion.span>

          <motion.h1
            initial={reduceMotion ? undefined : { opacity: 0, y: 12 }}
            animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05 }}
            className="mt-6 text-4xl leading-[0.95] font-normal tracking-tight text-balance sm:text-6xl md:text-7xl"
            style={{ fontFamily: "Anton, sans-serif" }}
          >
            TALENT WINS MATCHES.
            <br />
            <span className="text-lime-400">SYSTEMS WIN SEASONS.</span>
          </motion.h1>

          <motion.p
            initial={reduceMotion ? undefined : { opacity: 0, y: 12 }}
            animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="mt-6 max-w-xl text-base text-white/70 sm:text-lg"
          >
            SAMS is the operating system for football academies — registration, fees, training,
            matches, and the kit shop, run from one place and visible to every parent who's paying for it.
          </motion.p>

          <motion.div
            initial={reduceMotion ? undefined : { opacity: 0, y: 12 }}
            animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="mt-9 flex flex-wrap gap-3"
          >
            <Button asChild size="lg" className="h-11 bg-lime-400 px-6 text-base text-[#0B0F0A] hover:bg-lime-300">
              <Link to="/signup">
                Bring your academy onto SAMS
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-11 border-white/20 bg-transparent px-6 text-base text-white hover:bg-white/10"
            >
              <Link to="/login">Sign in to your portal</Link>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t border-white/10 bg-[#0E1310] py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2
            className="text-3xl tracking-tight sm:text-4xl"
            style={{ fontFamily: "Anton, sans-serif" }}
          >
            ONE PLATFORM. <span className="text-lime-400">EVERY MODULE.</span>
          </h2>
          <p className="mt-3 max-w-xl text-white/60">
            Everything a running academy actually needs, not a generic form builder.
          </p>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((feature) => (
              <div key={feature.label} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                <span className="flex size-11 items-center justify-center rounded-full border border-lime-400/30 text-lime-400">
                  <feature.icon className="size-5" aria-hidden />
                </span>
                <h3 className="mt-5 text-sm font-bold tracking-wide text-white uppercase">{feature.label}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/60">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section id="why-sams" className="border-t border-white/10 bg-[#0B0F0A] py-16">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-4 sm:px-6 md:grid-cols-4">
          {STATS.map((stat) => (
            <div key={stat.label} className="text-center md:text-left">
              <p className="text-4xl font-bold text-lime-400 tabular-nums" style={{ fontFamily: "Anton, sans-serif" }}>
                {stat.value}
              </p>
              <p className="mt-2 text-xs tracking-wide text-white/60 uppercase">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-t border-white/10 bg-[#0E1310] py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-xl text-center">
            <h2 className="text-3xl tracking-tight sm:text-4xl" style={{ fontFamily: "Anton, sans-serif" }}>
              ONE PLAN. <span className="text-lime-400">NO SURPRISES.</span>
            </h2>
            <p className="mt-3 text-white/60">
              Two simple charges — nothing per-staff-seat, nothing per-module, nothing hidden.
            </p>
          </div>

          <div className="mx-auto mt-12 max-w-md rounded-3xl border border-lime-400/30 bg-white/[0.03] p-8 text-center">
            <p className="text-xs font-bold tracking-[0.2em] text-lime-400 uppercase">Per active player</p>
            <p className="mt-4 flex items-end justify-center gap-1">
              <span className="text-2xl font-bold text-white/70">GH₵</span>
              <span className="text-6xl leading-none font-bold tabular-nums" style={{ fontFamily: "Anton, sans-serif" }}>
                {pricePerPlayer}
              </span>
              <span className="pb-1 text-white/60">/ month</span>
            </p>
            <p className="mt-2 text-sm text-white/50">Billed monthly for every currently active player — nothing for withdrawn or draft players.</p>

            <div className="mt-6 flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-left">
              <span className="text-sm text-white/70">One-time signup fee</span>
              <span className="text-sm font-bold tabular-nums text-white">GH₵{signupFee}</span>
            </div>

            <ul className="mt-6 space-y-3 text-left">
              {PRICING_INCLUDES.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-white/80">
                  <Check className="mt-0.5 size-4 shrink-0 text-lime-400" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>

            <Button asChild size="lg" className="mt-8 h-11 w-full bg-lime-400 text-base text-[#0B0F0A] hover:bg-lime-300">
              <Link to="/signup">
                Bring your academy onto SAMS
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="contact" className="border-t border-white/10 bg-[#0B0F0A] py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="text-3xl tracking-tight sm:text-4xl" style={{ fontFamily: "Anton, sans-serif" }}>
            READY TO RUN YOUR ACADEMY <span className="text-lime-400">LIKE A CLUB?</span>
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-white/60">
            Speak to us about a walkthrough with your own coaches and receptionist — most academies are live within a week.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <SamsSignupDialog
              trigger={
                <Button size="lg" className="h-11 bg-lime-400 px-6 text-base text-[#0B0F0A] hover:bg-lime-300">
                  Request a walkthrough
                </Button>
              }
            />
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-white/50">
            <a href="tel:0500008001" className="hover:text-white">
              0500 008 001
            </a>
            <a href="mailto:adabo@variablexsolutions.com" className="hover:text-white">
              adabo@variablexsolutions.com
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-[#0B0F0A] py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6">
          <div className="flex items-center gap-2">
            <SamsMark className="size-7" />
            <span className="text-sm font-semibold">SAMS</span>
          </div>
          <p className="text-xs text-white/50">
            © {new Date().getFullYear()} Soccer Academy Management System. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
