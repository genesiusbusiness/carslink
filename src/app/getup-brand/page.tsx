"use client"

import { LogoGetUp } from "@/components/getup/LogoGetUp"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  Shield, 
  Volume2, 
  Activity, 
  BarChart3, 
  Plane, 
  AlertTriangle,
  ExternalLink,
  FileText
} from "lucide-react"
import Link from "next/link"

/**
 * GETUP! Brand Showcase Page
 * 
 * Displays the GETUP! brand assets, features, and branding guidelines.
 * Accessible at: /getup-brand
 */
export default function GetUpBrandPage() {
  return (
    <div className="min-h-screen bg-[#0B0B0D] text-[#F5F7FA]">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="flex flex-col items-center justify-center text-center space-y-8">
          {/* Logo */}
          <div className="mb-8">
            <LogoGetUp variant="wordmark" size={400} />
          </div>
          
          {/* Tagline */}
          <h1 className="text-4xl md:text-6xl font-black uppercase tracking-wider" 
              style={{ fontFamily: '"Bebas Neue", "Anton", Impact, system-ui, sans-serif' }}>
            No mercy. No snooze.
          </h1>
          
          <p className="text-xl md:text-2xl text-[#F5F7FA]/70 max-w-2xl">
            The brutalist alarm that won&apos;t let you snooze. Complete tasks, solve puzzles, or scan QR codes to silence.
          </p>
          
          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 mt-8">
            <Button 
              disabled 
              className="bg-[#FF2D2D] hover:bg-[#E12626] text-white font-bold uppercase px-8 py-6 text-lg tracking-wider"
              style={{ fontFamily: '"Bebas Neue", "Anton", Impact, system-ui, sans-serif' }}
            >
              Download Soon
            </Button>
            <Button 
              asChild
              variant="outline"
              className="border-[#1C1E22] text-[#F5F7FA] hover:bg-[#1C1E22] hover:text-[#FF2D2D] px-8 py-6 text-lg"
            >
              <Link href="/getup/manifest.webmanifest" className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                View Manifest
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl md:text-4xl font-black uppercase text-center mb-12 tracking-wider"
            style={{ fontFamily: '"Bebas Neue", "Anton", Impact, system-ui, sans-serif' }}>
          Features
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Anti-Snooze */}
          <Card className="bg-[#1C1E22] border-[#1C1E22] text-[#F5F7FA]">
            <CardHeader>
              <div className="w-12 h-12 bg-[#FF2D2D] rounded-lg flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <CardTitle className="text-xl font-bold uppercase tracking-wide">
                Anti-Snooze
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-[#F5F7FA]/70">
                Scan QR codes, solve puzzles, or complete step counters to silence alarms. No easy dismiss.
              </CardDescription>
            </CardContent>
          </Card>

          {/* Randomized Audio */}
          <Card className="bg-[#1C1E22] border-[#1C1E22] text-[#F5F7FA]">
            <CardHeader>
              <div className="w-12 h-12 bg-[#FF2D2D] rounded-lg flex items-center justify-center mb-4">
                <Volume2 className="w-6 h-6 text-white" />
              </div>
              <CardTitle className="text-xl font-bold uppercase tracking-wide">
                Randomized Audio
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-[#F5F7FA]/70">
                Anti-habituation sound rotation prevents your brain from tuning out. Customizable library.
              </CardDescription>
            </CardContent>
          </Card>

          {/* Safe dB Limits */}
          <Card className="bg-[#1C1E22] border-[#1C1E22] text-[#F5F7FA]">
            <CardHeader>
              <div className="w-12 h-12 bg-[#FF2D2D] rounded-lg flex items-center justify-center mb-4">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <CardTitle className="text-xl font-bold uppercase tracking-wide">
                Safe dB Limits
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-[#F5F7FA]/70">
                Built-in decibel monitoring prevents hearing damage. Respects device maximum safe volume.
              </CardDescription>
            </CardContent>
          </Card>

          {/* Journal & Stats */}
          <Card className="bg-[#1C1E22] border-[#1C1E22] text-[#F5F7FA]">
            <CardHeader>
              <div className="w-12 h-12 bg-[#FF2D2D] rounded-lg flex items-center justify-center mb-4">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <CardTitle className="text-xl font-bold uppercase tracking-wide">
                Journal & Stats
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-[#F5F7FA]/70">
                Track wake-up times, monitor success rates, view sleep patterns. Export data for analysis.
              </CardDescription>
            </CardContent>
          </Card>

          {/* Travel Mode */}
          <Card className="bg-[#1C1E22] border-[#1C1E22] text-[#F5F7FA]">
            <CardHeader>
              <div className="w-12 h-12 bg-[#FF2D2D] rounded-lg flex items-center justify-center mb-4">
                <Plane className="w-6 h-6 text-white" />
              </div>
              <CardTitle className="text-xl font-bold uppercase tracking-wide">
                Travel Mode
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-[#F5F7FA]/70">
                Works offline, timezone-aware alarms, silent mode for flights. Battery-efficient.
              </CardDescription>
            </CardContent>
          </Card>

          {/* Critical Alerts */}
          <Card className="bg-[#1C1E22] border-[#1C1E22] text-[#F5F7FA]">
            <CardHeader>
              <div className="w-12 h-12 bg-[#FF2D2D] rounded-lg flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
              <CardTitle className="text-xl font-bold uppercase tracking-wide">
                Critical Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-[#F5F7FA]/70">
                Bypasses Do Not Disturb for reliable emergency wake-ups. Configurable per alarm.
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Brand Info */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <h2 className="text-3xl md:text-4xl font-black uppercase tracking-wider"
              style={{ fontFamily: '"Bebas Neue", "Anton", Impact, system-ui, sans-serif' }}>
            The Brutalist Philosophy
          </h2>
          <p className="text-lg text-[#F5F7FA]/70 leading-relaxed">
            GETUP! embraces a brutalist, minimal design. No frills, no distractions. Just pure functionality 
            that gets the job done. High contrast, aggressive typography, and a no-nonsense interface.
          </p>
          <p className="text-lg text-[#F5F7FA]/70 leading-relaxed">
            Privacy first. Works entirely offline. No tracking, no analytics, no data collection. 
            Your wake-up data stays on your device.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#1C1E22] py-8 mt-16">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <LogoGetUp variant="compact" size={48} />
              <span className="text-[#F5F7FA]/60 text-sm">
                © {new Date().getFullYear()} GETUP! by Flynesis
              </span>
            </div>
            <div className="flex gap-6 text-sm text-[#F5F7FA]/60">
              <Link href="/getup/manifest.webmanifest" className="hover:text-[#FF2D2D] transition-colors">
                Manifest
              </Link>
              <span>•</span>
              <span>Privacy First</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

