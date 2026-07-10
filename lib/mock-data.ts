export interface Student {
  id: string
  name: string
  email: string
  section: string
  learningLevel: 'Beginner' | 'Intermediate' | 'Advanced'
  masteryScore: number
  completionPercentage: number
  accuracyPercentage: number
  riskLevel: 'Low' | 'Medium' | 'High'
  avatar?: string
  enrolledDate: string
}

export interface DashboardStats {
  totalStudents: number
  activeUsers: number
  averageAccuracy: number
  completionRate: number
  atRiskStudents: number
  avgLessonTime: number
  totalSigns: number
  avgRecognitionAccuracy: number
}

export interface ActivityLog {
  id: string
  studentName: string
  action: string
  timestamp: string
  status: 'success' | 'in-progress' | 'pending'
}

export interface SignPerformance {
  sign: string
  category: string
  recognition_rate: number
  attempts: number
  avg_confidence: number
}

export interface AnalyticsData {
  date: string
  completionRate: number
  avgAccuracy: number
  activeStudents: number
  newSignsMastered: number
}

// Mock Students Data
export const mockStudents: Student[] = [
  {
    id: '1',
    name: 'Maria Santos',
    email: 'maria.santos@school.edu',
    section: '10-A',
    learningLevel: 'Beginner',
    masteryScore: 62,
    completionPercentage: 58,
    accuracyPercentage: 68,
    riskLevel: 'Medium',
    enrolledDate: '2024-01-15',
  },
  {
    id: '2',
    name: 'Juan Cruz',
    email: 'juan.cruz@school.edu',
    section: '10-B',
    learningLevel: 'Intermediate',
    masteryScore: 78,
    completionPercentage: 75,
    accuracyPercentage: 82,
    riskLevel: 'Low',
    enrolledDate: '2024-01-10',
  },
  {
    id: '3',
    name: 'Ana Lopez',
    email: 'ana.lopez@school.edu',
    section: '10-A',
    learningLevel: 'Advanced',
    masteryScore: 92,
    completionPercentage: 95,
    accuracyPercentage: 94,
    riskLevel: 'Low',
    enrolledDate: '2023-11-20',
  },
  {
    id: '4',
    name: 'Carlos Reyes',
    email: 'carlos.reyes@school.edu',
    section: '10-C',
    learningLevel: 'Beginner',
    masteryScore: 45,
    completionPercentage: 40,
    accuracyPercentage: 52,
    riskLevel: 'High',
    enrolledDate: '2024-02-01',
  },
  {
    id: '5',
    name: 'Rosa Garcia',
    email: 'rosa.garcia@school.edu',
    section: '10-B',
    learningLevel: 'Intermediate',
    masteryScore: 71,
    completionPercentage: 68,
    accuracyPercentage: 75,
    riskLevel: 'Low',
    enrolledDate: '2024-01-12',
  },
  {
    id: '6',
    name: 'Miguel Torres',
    email: 'miguel.torres@school.edu',
    section: '10-A',
    learningLevel: 'Advanced',
    masteryScore: 85,
    completionPercentage: 88,
    accuracyPercentage: 89,
    riskLevel: 'Low',
    enrolledDate: '2023-12-01',
  },
  {
    id: '7',
    name: 'Lisa Fernandez',
    email: 'lisa.fernandez@school.edu',
    section: '10-C',
    learningLevel: 'Beginner',
    masteryScore: 55,
    completionPercentage: 50,
    accuracyPercentage: 61,
    riskLevel: 'Medium',
    enrolledDate: '2024-01-25',
  },
  {
    id: '8',
    name: 'Ricardo Diaz',
    email: 'ricardo.diaz@school.edu',
    section: '10-B',
    learningLevel: 'Intermediate',
    masteryScore: 68,
    completionPercentage: 65,
    accuracyPercentage: 72,
    riskLevel: 'Medium',
    enrolledDate: '2024-01-18',
  },
]

// Dashboard Stats
export const mockDashboardStats: DashboardStats = {
  totalStudents: 156,
  activeUsers: 142,
  averageAccuracy: 74.2,
  completionRate: 68.5,
  atRiskStudents: 12,
  avgLessonTime: 42,
  totalSigns: 247,
  avgRecognitionAccuracy: 79.8,
}

// Activity Logs
export const mockActivityLogs: ActivityLog[] = [
  {
    id: '1',
    studentName: 'Maria Santos',
    action: 'Completed Alphabet Module',
    timestamp: '2 hours ago',
    status: 'success',
  },
  {
    id: '2',
    studentName: 'Juan Cruz',
    action: 'Practiced Daily Challenge',
    timestamp: '1 hour ago',
    status: 'success',
  },
  {
    id: '3',
    studentName: 'Ana Lopez',
    action: 'Assessment: Numbers (1-10)',
    timestamp: '30 minutes ago',
    status: 'success',
  },
  {
    id: '4',
    studentName: 'Carlos Reyes',
    action: 'Started New Module',
    timestamp: '15 minutes ago',
    status: 'in-progress',
  },
  {
    id: '5',
    studentName: 'Rosa Garcia',
    action: 'Earned Badge: Sign Master',
    timestamp: '10 minutes ago',
    status: 'success',
  },
]

// Sign Performance Data
export const mockSignPerformance: SignPerformance[] = [
  {
    sign: 'Hello',
    category: 'Greetings',
    recognition_rate: 94,
    attempts: 245,
    avg_confidence: 0.91,
  },
  {
    sign: 'Thank You',
    category: 'Politeness',
    recognition_rate: 88,
    attempts: 198,
    avg_confidence: 0.85,
  },
  {
    sign: 'Please',
    category: 'Politeness',
    recognition_rate: 82,
    attempts: 176,
    avg_confidence: 0.79,
  },
  {
    sign: 'Yes',
    category: 'Responses',
    recognition_rate: 96,
    attempts: 289,
    avg_confidence: 0.93,
  },
  {
    sign: 'No',
    category: 'Responses',
    recognition_rate: 91,
    attempts: 267,
    avg_confidence: 0.88,
  },
  {
    sign: 'Help',
    category: 'Daily Living',
    recognition_rate: 75,
    attempts: 142,
    avg_confidence: 0.71,
  },
]

// Analytics Time Series Data
export const mockAnalyticsData: AnalyticsData[] = [
  {
    date: 'Jan 1',
    completionRate: 55,
    avgAccuracy: 68,
    activeStudents: 120,
    newSignsMastered: 24,
  },
  {
    date: 'Jan 2',
    completionRate: 58,
    avgAccuracy: 70,
    activeStudents: 128,
    newSignsMastered: 28,
  },
  {
    date: 'Jan 3',
    completionRate: 61,
    avgAccuracy: 72,
    activeStudents: 135,
    newSignsMastered: 32,
  },
  {
    date: 'Jan 4',
    completionRate: 64,
    avgAccuracy: 73,
    activeStudents: 140,
    newSignsMastered: 35,
  },
  {
    date: 'Jan 5',
    completionRate: 66,
    avgAccuracy: 74,
    activeStudents: 142,
    newSignsMastered: 38,
  },
  {
    date: 'Jan 6',
    completionRate: 68,
    avgAccuracy: 75,
    activeStudents: 144,
    newSignsMastered: 41,
  },
  {
    date: 'Jan 7',
    completionRate: 68.5,
    avgAccuracy: 74.2,
    activeStudents: 142,
    newSignsMastered: 39,
  },
]

// Leaderboard Data
export const mockLeaderboard = [
  { rank: 1, name: 'Ana Lopez', score: 4850, badges: 12, level: 'Expert' },
  { rank: 2, name: 'Miguel Torres', score: 4320, badges: 10, level: 'Advanced' },
  { rank: 3, name: 'Juan Cruz', score: 3980, badges: 8, level: 'Advanced' },
  { rank: 4, name: 'Rosa Garcia', score: 3540, badges: 6, level: 'Intermediate' },
  { rank: 5, name: 'Ricardo Diaz', score: 3210, badges: 5, level: 'Intermediate' },
  { rank: 6, name: 'Maria Santos', score: 2890, badges: 3, level: 'Beginner' },
  { rank: 7, name: 'Lisa Fernandez', score: 2450, badges: 2, level: 'Beginner' },
  { rank: 8, name: 'Carlos Reyes', score: 1980, badges: 1, level: 'Beginner' },
]

// Faculty Data
export const mockFaculty = [
  {
    id: '1',
    name: 'Dr. Maria Hernandez',
    email: 'maria.hernandez@school.edu',
    role: 'Head of FSL Department',
    sections: ['10-A', '10-B'],
    studentsAssigned: 45,
    interventionCount: 8,
    lastActive: '2 hours ago',
  },
  {
    id: '2',
    name: 'Prof. Jose Rodriguez',
    email: 'jose.rodriguez@school.edu',
    role: 'FSL Instructor',
    sections: ['10-C', '11-A'],
    studentsAssigned: 38,
    interventionCount: 12,
    lastActive: '30 minutes ago',
  },
  {
    id: '3',
    name: 'Ms. Patricia Diaz',
    email: 'patricia.diaz@school.edu',
    role: 'FSL Instructor',
    sections: ['10-A', '11-B'],
    studentsAssigned: 42,
    interventionCount: 5,
    lastActive: '1 hour ago',
  },
]
