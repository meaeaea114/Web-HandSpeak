'use client'

import { useState } from 'react'
import { CheckCircle2, XCircle, Clock, Brain } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth-context'
import { Permission } from '@/lib/rbac'

const mockPendingContent = [
  {
    id: 1,
    title: 'Numbers Recognition Quiz',
    author: 'Ms. Jane Smith',
    type: 'Quiz',
    module: 'Numbers',
    submittedDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
    status: 'pending',
  },
  {
    id: 2,
    title: 'Common Phrases Video',
    author: 'Mr. Carlos Rodriguez',
    type: 'Video',
    module: 'Phrases',
    submittedDate: new Date(Date.now() - 48 * 60 * 60 * 1000),
    status: 'pending',
  },
  {
    id: 3,
    title: 'Alphabet Flashcards',
    author: 'Ms. Maria Santos',
    type: 'Activity',
    module: 'Alphabet',
    submittedDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    status: 'pending',
  },
]

export default function ContentApprovalPage() {
  const { hasPermission } = useAuth()
  const [content, setContent] = useState(mockPendingContent)
  const [selectedContent, setSelectedContent] = useState<number | null>(null)

  if (!hasPermission(Permission.APPROVE_CONTENT)) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold text-foreground">Access Denied</p>
          <p className="text-sm text-muted-foreground">You don't have permission to approve content</p>
        </div>
      </div>
    )
  }

  const handleApprove = (id: number) => {
    setContent(content.filter((c) => c.id !== id))
  }

  const handleReject = (id: number) => {
    setContent(content.filter((c) => c.id !== id))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Content Approval</h1>
        <p className="mt-1 text-sm text-muted-foreground">Review and approve teacher-submitted content</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground">PENDING REVIEW</p>
              <p className="mt-2 text-2xl font-bold text-foreground">{content.length}</p>
            </div>
            <Clock className="h-8 w-8 text-yellow-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground">APPROVED</p>
              <p className="mt-2 text-2xl font-bold text-foreground">24</p>
            </div>
            <CheckCircle2 className="h-8 w-8 text-green-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground">REJECTED</p>
              <p className="mt-2 text-2xl font-bold text-foreground">3</p>
            </div>
            <XCircle className="h-8 w-8 text-red-500" />
          </div>
        </Card>
      </div>

      {/* Content List */}
      <div className="space-y-3">
        {content.length === 0 ? (
          <Card className="p-12 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" />
            <p className="mt-4 text-lg font-semibold text-foreground">All Content Approved!</p>
            <p className="text-sm text-muted-foreground">No pending content to review</p>
          </Card>
        ) : (
          content.map((item) => (
            <Card key={item.id} className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 flex-1">
                  <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/20">
                    <Brain className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">{item.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      By {item.author} • {item.type} • {item.module}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Submitted {item.submittedDate.toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleApprove(item.id)}
                    className="bg-green-500 hover:bg-green-600 text-white gap-2"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Approve
                  </Button>
                  <Button
                    onClick={() => handleReject(item.id)}
                    variant="outline"
                    className="gap-2 text-red-500 border-red-200 hover:bg-red-50"
                  >
                    <XCircle className="h-4 w-4" />
                    Reject
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
