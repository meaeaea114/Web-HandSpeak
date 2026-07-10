'use client'

import { mockLeaderboard } from '@/lib/mock-data'
import { Trophy, Star, Award } from 'lucide-react'

export default function LeaderboardPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Leaderboard</h1>
        <p className="mt-2 text-muted-foreground">
          Celebrate student achievements and progress
        </p>
      </div>

      {/* Top 3 Podium */}
      <div className="grid gap-6 md:grid-cols-3">
        {mockLeaderboard.slice(0, 3).map((student, index) => {
          const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'
          const podiumHeight = index === 0 ? 'h-48' : index === 1 ? 'h-40' : 'h-32'

          return (
            <div key={student.rank} className="flex flex-col items-center">
              <div className={`${podiumHeight} w-full rounded-t-2xl border border-border bg-gradient-to-b from-primary/20 to-primary/10 flex items-center justify-center relative overflow-hidden`}>
                <div className="text-6xl">{medal}</div>
              </div>
              <div className="w-full rounded-b-2xl border border-t-0 border-border bg-card p-6">
                <h3 className="text-lg font-semibold text-foreground text-center">{student.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground text-center">{student.level}</p>
                <p className="mt-3 text-center text-2xl font-bold text-primary">{student.score}</p>
                <p className="mt-1 text-xs text-muted-foreground text-center">Points</p>
                <div className="mt-3 flex items-center justify-center gap-1">
                  {Array.from({ length: student.badges }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Full Leaderboard */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="p-6 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">Complete Rankings</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Rank</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Student</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Level</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Points</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Badges</th>
              </tr>
            </thead>
            <tbody>
              {mockLeaderboard.map((student, index) => (
                <tr
                  key={student.rank}
                  className={`border-b border-border hover:bg-muted/50 transition-colors ${
                    index < 3 ? 'bg-primary/5' : ''
                  }`}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 font-bold text-primary">
                      {student.rank}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-medium text-foreground">{student.name}</p>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                      student.level === 'Expert'
                        ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                        : student.level === 'Advanced'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                    }`}>
                      {student.level}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-bold text-foreground">{student.score}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1">
                      {Array.from({ length: student.badges }).map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Achievements Grid */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">Achievement System</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-border bg-card p-6 text-center">
            <div className="text-3xl mb-3">🌟</div>
            <h4 className="font-semibold text-foreground">Sign Mastery</h4>
            <p className="text-xs text-muted-foreground mt-1">Perfect 100% accuracy</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-6 text-center">
            <div className="text-3xl mb-3">🔥</div>
            <h4 className="font-semibold text-foreground">Streak Master</h4>
            <p className="text-xs text-muted-foreground mt-1">7-day practice streak</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-6 text-center">
            <div className="text-3xl mb-3">🎯</div>
            <h4 className="font-semibold text-foreground">Speedrunner</h4>
            <p className="text-xs text-muted-foreground mt-1">Complete lesson in 5 min</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-6 text-center">
            <div className="text-3xl mb-3">👑</div>
            <h4 className="font-semibold text-foreground">Champion</h4>
            <p className="text-xs text-muted-foreground mt-1">Reach top 3 ranking</p>
          </div>
        </div>
      </div>
    </div>
  )
}
