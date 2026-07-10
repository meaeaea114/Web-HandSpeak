'use client'

import { useState } from 'react'
import { Search, Filter, MessageSquare, CheckCircle2, AlertCircle, Clock } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { useAuth } from '@/lib/auth-context'
import { Permission } from '@/lib/rbac'

interface Feedback {
  id: string
  teacherName: string
  teacherEmail: string
  subject: string
  category: 'bug' | 'feature' | 'support' | 'general'
  message: string
  status: 'open' | 'in-progress' | 'resolved'
  dateSubmitted: string
  adminResponse?: string
}

const mockFeedback: Feedback[] = [
  {
    id: '1',
    teacherName: 'Ma. Santos',
    teacherEmail: 'ma.santos@school.edu',
    subject: 'Content approval is slow',
    category: 'support',
    message: 'The content approval process is taking longer than expected. Can we expedite it?',
    status: 'in-progress',
    dateSubmitted: '2024-06-05',
  },
  {
    id: '2',
    teacherName: 'Juan Dela Cruz',
    teacherEmail: 'juan.delacruz@school.edu',
    subject: 'Request for bulk upload feature',
    category: 'feature',
    message: 'It would be great to upload multiple assessments at once instead of one by one.',
    status: 'open',
    dateSubmitted: '2024-06-04',
  },
  {
    id: '3',
    teacherName: 'Rosa Hernandez',
    teacherEmail: 'rosa.hernandez@school.edu',
    subject: 'Analytics graphs are unclear',
    category: 'bug',
    message: 'Some analytics graphs do not display correctly on smaller screens.',
    status: 'resolved',
    dateSubmitted: '2024-06-01',
    adminResponse: 'Thank you for reporting this. We have fixed the responsive display issue.',
  },
]

export default function FeedbackPage() {
  const { hasPermission } = useAuth()
  const [feedback, setFeedback] = useState<Feedback[]>(mockFeedback)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null)
  const [replyText, setReplyText] = useState('')

  if (!hasPermission(Permission.MANAGE_FEEDBACK)) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold text-foreground">Access Denied</p>
          <p className="text-sm text-muted-foreground">You don't have permission to manage feedback</p>
        </div>
      </div>
    )
  }

  const filteredFeedback = feedback.filter(
    (item) =>
      item.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.teacherName.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const updateStatus = (id: string, newStatus: 'open' | 'in-progress' | 'resolved') => {
    setFeedback(feedback.map((item) => (item.id === id ? { ...item, status: newStatus } : item)))
    if (selectedFeedback?.id === id) {
      setSelectedFeedback({ ...selectedFeedback, status: newStatus })
    }
  }

  const sendReply = (id: string) => {
    if (replyText.trim()) {
      setFeedback(feedback.map((item) => (item.id === id ? { ...item, adminResponse: replyText } : item)))
      if (selectedFeedback?.id === id) {
        setSelectedFeedback({ ...selectedFeedback, adminResponse: replyText })
      }
      setReplyText('')
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'bug':
        return 'bg-red-100 text-red-800'
      case 'feature':
        return 'bg-blue-100 text-blue-800'
      case 'support':
        return 'bg-yellow-100 text-yellow-800'
      case 'general':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <AlertCircle className="h-5 w-5 text-orange-600" />
      case 'in-progress':
        return <Clock className="h-5 w-5 text-blue-600" />
      case 'resolved':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />
      default:
        return null
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Feedback List */}
      <div className="lg:col-span-2 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Feedback & Support</h1>
          <p className="mt-1 text-sm text-muted-foreground">Review and respond to teacher feedback and support requests</p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search feedback..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-input bg-background py-2 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground"
          />
        </div>

        {/* Feedback List */}
        <div className="space-y-4">
          {filteredFeedback.length === 0 ? (
            <Card className="p-12 text-center">
              <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-4 text-sm text-muted-foreground">No feedback found.</p>
            </Card>
          ) : (
            filteredFeedback.map((item) => (
              <Card
                key={item.id}
                onClick={() => setSelectedFeedback(item)}
                className={`cursor-pointer p-6 transition-colors hover:bg-muted ${
                  selectedFeedback?.id === item.id ? 'border-primary bg-primary/5' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(item.status)}
                      <h3 className="font-semibold text-foreground">{item.subject}</h3>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{item.teacherName}</p>
                    <p className="mt-3 text-sm text-foreground">{item.message.substring(0, 100)}...</p>
                    <div className="mt-4 flex gap-2">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getCategoryColor(item.category)}`}>
                        {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(item.dateSubmitted).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Detail View */}
      {selectedFeedback && (
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-foreground">Feedback Details</h2>

            {/* Status */}
            <div className="mt-6 space-y-3">
              <p className="text-sm font-medium text-muted-foreground">Status</p>
              <div className="flex gap-2">
                {(['open', 'in-progress', 'resolved'] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => updateStatus(selectedFeedback.id, status)}
                    className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
                      selectedFeedback.status === status
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-foreground hover:bg-muted'
                    }`}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Teacher Info */}
            <div className="mt-6 space-y-2">
              <p className="text-sm font-medium text-muted-foreground">From</p>
              <p className="font-medium text-foreground">{selectedFeedback.teacherName}</p>
              <p className="text-sm text-muted-foreground">{selectedFeedback.teacherEmail}</p>
            </div>

            {/* Category */}
            <div className="mt-6 space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Category</p>
              <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getCategoryColor(selectedFeedback.category)}`}>
                {selectedFeedback.category.charAt(0).toUpperCase() + selectedFeedback.category.slice(1)}
              </span>
            </div>

            {/* Full Message */}
            <div className="mt-6 space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Message</p>
              <p className="text-sm text-foreground">{selectedFeedback.message}</p>
            </div>

            {/* Admin Response */}
            <div className="mt-6 space-y-3">
              <p className="text-sm font-medium text-muted-foreground">Your Response</p>
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Type your response here..."
                className="min-h-24 w-full rounded-lg border border-input bg-background p-3 text-sm text-foreground placeholder:text-muted-foreground"
              />
              <button
                onClick={() => sendReply(selectedFeedback.id)}
                className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              >
                Send Response
              </button>
            </div>

            {/* Existing Response */}
            {selectedFeedback.adminResponse && (
              <div className="mt-6 space-y-2 rounded-lg border border-green-200 bg-green-50 p-4">
                <p className="text-sm font-medium text-green-900">Admin Response</p>
                <p className="text-sm text-green-800">{selectedFeedback.adminResponse}</p>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Stats */}
      {!selectedFeedback && (
        <div className="space-y-4">
          <Card className="p-6">
            <p className="text-sm text-muted-foreground">Total Feedback</p>
            <p className="mt-2 text-3xl font-bold text-foreground">{feedback.length}</p>
          </Card>
          <Card className="p-6">
            <p className="text-sm text-muted-foreground">Open</p>
            <p className="mt-2 text-3xl font-bold text-orange-600">{feedback.filter((f) => f.status === 'open').length}</p>
          </Card>
          <Card className="p-6">
            <p className="text-sm text-muted-foreground">In Progress</p>
            <p className="mt-2 text-3xl font-bold text-blue-600">{feedback.filter((f) => f.status === 'in-progress').length}</p>
          </Card>
          <Card className="p-6">
            <p className="text-sm text-muted-foreground">Resolved</p>
            <p className="mt-2 text-3xl font-bold text-green-600">{feedback.filter((f) => f.status === 'resolved').length}</p>
          </Card>
        </div>
      )}
    </div>
  )
}
