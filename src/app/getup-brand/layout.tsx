import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "GETUP! - Brand Showcase",
  description: "The brutalist alarm that won't let you snooze. No mercy. No excuses. GETUP!",
  keywords: ["GETUP", "alarm", "wake up", "anti-snooze", "productivity", "brutalist", "minimal"],
  openGraph: {
    title: "GETUP! - Brand Showcase",
    description: "The brutalist alarm that won't let you snooze. No mercy. No excuses.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "GETUP! - Brand Showcase",
    description: "The brutalist alarm that won't let you snooze. No mercy. No excuses.",
  },
  themeColor: "#0B0B0D",
}

export default function GetUpBrandLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}

