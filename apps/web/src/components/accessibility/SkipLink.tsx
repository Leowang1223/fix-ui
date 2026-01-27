'use client'

interface SkipLinkProps {
  targetId?: string
  label?: string
}

/**
 * Skip Link component for keyboard accessibility
 * Allows users to skip navigation and jump directly to main content
 */
export function SkipLink({
  targetId = 'main-content',
  label = '跳至主要內容'
}: SkipLinkProps) {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    const target = document.getElementById(targetId)
    if (target) {
      target.focus()
      target.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <a
      href={`#${targetId}`}
      className="skip-link"
      onClick={handleClick}
    >
      {label}
    </a>
  )
}

export default SkipLink
