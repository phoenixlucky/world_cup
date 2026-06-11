/**
 * FlagImg — renders a country flag from flagcdn.com
 *
 * Falls back to a text placeholder if the image fails to load.
 */
import { useState } from 'react'
import { getFlagUrl } from '../data/teams'

interface Props {
  code: string
  size?: number
  alt?: string
  className?: string
}

export function FlagImg({ code, size = 24, alt = '', className = '' }: Props) {
  const [failed, setFailed] = useState(false)

  if (failed || !code) {
    // Fallback: show a generic flag placeholder
    return (
      <span
        className={`inline-flex items-center justify-center bg-slate-700 rounded ${className}`}
        style={{ width: size * 1.5, height: size }}
        title={alt}
      >
        🏳️
      </span>
    )
  }

  return (
    <img
      src={getFlagUrl(code)}
      alt={alt || code}
      className={`inline-block rounded-sm object-cover ${className}`}
      style={{ width: size * 1.5, height: size }}
      onError={() => setFailed(true)}
      loading="lazy"
    />
  )
}
