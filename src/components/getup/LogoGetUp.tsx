import React from 'react'

interface LogoGetUpProps {
  variant?: 'wordmark' | 'compact' | 'full'
  color?: 'red' | 'white' | 'auto'
  size?: number
  className?: string
}

/**
 * GETUP! Logo Component
 * 
 * Renders the GETUP! logo in various formats:
 * - wordmark: Horizontal logo with "GETUP!" text
 * - compact: Square "GU!" monogram
 * - full: Full logo (same as wordmark)
 * 
 * @param variant - Logo variant to display
 * @param color - Color scheme ('red' for red text, 'white' for white text, 'auto' for default)
 * @param size - Optional size override (width in pixels)
 * @param className - Additional CSS classes
 */
export function LogoGetUp({
  variant = 'wordmark',
  color = 'auto',
  size,
  className = '',
}: LogoGetUpProps) {
  const width = size || (variant === 'compact' ? 120 : 400)
  const height = variant === 'compact' ? 120 : 120

  // Color mapping
  const textColor = color === 'red' ? '#FF2D2D' : color === 'white' ? '#F5F7FA' : '#F5F7FA'
  const bgColor = variant === 'compact' ? '#0B0B0D' : 'none'
  const alarmColor = '#FF2D2D'

  if (variant === 'compact') {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 120 120"
        width={width}
        height={height}
        className={className}
        role="img"
        aria-label="GETUP! Compact Logo"
      >
        <title>GETUP! Compact Logo (GU!)</title>
        {/* Square background */}
        <rect width="120" height="120" fill={bgColor} rx="8" />
        {/* GU text */}
        <text
          x="20"
          y="75"
          fontFamily="Impact, 'Bebas Neue', 'Anton', sans-serif"
          fontSize="60"
          fontWeight="900"
          fill={textColor}
          letterSpacing="1"
        >
          GU
        </text>
        {/* Stylized exclamation mark as alarm bar */}
        <g transform="translate(85, 20)">
          {/* Vertical alarm bar */}
          <rect x="0" y="0" width="12" height="50" fill={alarmColor} rx="1" />
          {/* Inner cut notch (warning LED effect) */}
          <rect x="2" y="2" width="8" height="8" fill={bgColor} rx="0.5" />
          {/* Small square dot at bottom */}
          <rect x="4" y="42" width="4" height="4" fill={alarmColor} rx="0.5" />
        </g>
      </svg>
    )
  }

  // Wordmark and full variants (same design)
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 400 120"
      width={width}
      height={height}
      className={className}
      role="img"
      aria-label="GETUP! Logo"
    >
      <title>GETUP! Logo</title>
      {/* GETUP text */}
      <text
        x="20"
        y="85"
        fontFamily="Impact, 'Bebas Neue', 'Anton', sans-serif"
        fontSize="80"
        fontWeight="900"
        fill={textColor}
        letterSpacing="2"
      >
        GETUP
      </text>
      {/* Stylized exclamation mark as alarm bar */}
      <g transform="translate(300, 10)">
        {/* Vertical alarm bar */}
        <rect x="0" y="0" width="20" height="80" fill={alarmColor} rx="2" />
        {/* Inner cut notch (warning LED effect) */}
        <rect x="4" y="4" width="12" height="12" fill="#0B0B0D" rx="1" />
        {/* Small square dot at bottom */}
        <rect x="6" y="70" width="8" height="8" fill={alarmColor} rx="1" />
      </g>
    </svg>
  )
}

export default LogoGetUp

