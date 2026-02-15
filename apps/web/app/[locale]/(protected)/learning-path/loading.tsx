import Skeleton from '@/components/ui/Skeleton'

export default function LearningPathLoading() {
  return (
    <div className="w-full space-y-6">
      <Skeleton className="h-48 rounded-3xl" />
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-2xl" />
        ))}
      </div>
    </div>
  )
}
