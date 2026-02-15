/**
 * 分數徽章組件
 * 顯示分數並根據分數高低顯示不同顏色
 */

interface ScoreBadgeProps {
  score: number
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
}

export function ScoreBadge({ score, size = 'md', showLabel = true }: ScoreBadgeProps) {
  const getScoreColor = (score: number): string => {
    if (score >= 90) return 'text-green-600'
    if (score >= 75) return 'text-blue-600'
    return 'text-orange-600'
  }

  const getScoreBackground = (score: number): string => {
    if (score >= 90) return 'bg-green-100'
    if (score >= 75) return 'bg-blue-100'
    return 'bg-orange-100'
  }

  const getSizeClasses = (size: string): { text: string; container: string } => {
    switch (size) {
      case 'sm':
        return { text: 'text-lg', container: 'px-2 py-1' }
      case 'lg':
        return { text: 'text-4xl', container: 'px-6 py-4' }
      default:
        return { text: 'text-2xl', container: 'px-4 py-2' }
    }
  }

  const sizeClasses = getSizeClasses(size)

  return (
    <div className={`${getScoreBackground(score)} rounded-lg ${sizeClasses.container} text-center inline-block`}>
      <span className={`${getScoreColor(score)} ${sizeClasses.text} font-bold`}>
        {score}
      </span>
      {showLabel && (
        <span className="text-gray-500 text-sm ml-1">pts</span>
      )}
    </div>
  )
}
