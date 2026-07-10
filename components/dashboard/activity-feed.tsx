import { ActivityLog } from '@/lib/mock-data'
import { CheckCircle, Clock, AlertCircle } from 'lucide-react'

interface ActivityFeedProps {
  activities: ActivityLog[]
}

export function ActivityFeed({ activities }: ActivityFeedProps) {
  const statusIcon = {
    success: <CheckCircle className="h-5 w-5 text-green-600" />,
    'in-progress': <Clock className="h-5 w-5 text-blue-600" />,
    pending: <AlertCircle className="h-5 w-5 text-yellow-600" />,
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <h3 className="text-lg font-semibold text-foreground">Recent Activity</h3>
      
      <div className="mt-6 space-y-4">
        {activities.map((activity, index) => (
          <div key={activity.id} className="flex gap-4">
            <div className="flex-shrink-0">
              {statusIcon[activity.status]}
            </div>
            
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">
                {activity.studentName}
              </p>
              <p className="text-sm text-muted-foreground">
                {activity.action}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {activity.timestamp}
              </p>
            </div>

            {index !== activities.length - 1 && (
              <div className="absolute left-7 top-full h-4 w-0.5 bg-border" />
            )}
          </div>
        ))}
      </div>

      <button className="mt-6 w-full rounded-lg border border-border py-2 text-sm font-medium text-primary hover:bg-primary/5">
        View All Activity
      </button>
    </div>
  )
}
