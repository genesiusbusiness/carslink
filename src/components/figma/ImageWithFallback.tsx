"use client"

import { useState } from "react"
import Image from "next/image"
import { cn } from "@/lib/utils"

interface ImageWithFallbackProps {
  src?: string | null
  alt: string
  fallback?: string
  className?: string
  width?: number
  height?: number
  fill?: boolean
  objectFit?: "contain" | "cover" | "fill" | "none" | "scale-down"
}

export function ImageWithFallback({
  src,
  alt,
  fallback = "/placeholder.png",
  className,
  width,
  height,
  fill,
  objectFit = "cover",
}: ImageWithFallbackProps) {
  const [imgSrc, setImgSrc] = useState(src || fallback)
  const [hasError, setHasError] = useState(false)

  const handleError = () => {
    if (!hasError) {
      setHasError(true)
      setImgSrc(fallback)
    }
  }

  if (fill) {
    return (
      <div className={cn("relative", className)}>
        <Image
          src={imgSrc}
          alt={alt}
          fill
          className={cn("object-cover", `object-${objectFit}`)}
          onError={handleError}
        />
      </div>
    )
  }

  return (
    <Image
      src={imgSrc}
      alt={alt}
      width={width || 200}
      height={height || 200}
      className={cn(className, `object-${objectFit}`)}
      onError={handleError}
    />
  )
}

