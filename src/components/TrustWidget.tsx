import React from 'react'
import { getTrustScoreSummary } from '../lib/trust-data'

interface TrustWidgetProps {
  userAddress: string
}

export default function TrustWidget({ userAddress }: TrustWidgetProps) {
  const trustSummary = getTrustScoreSummary(userAddress)
  
  if (!trustSummary) {
    return (
      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-gray-400 to-gray-500 rounded-xl flex items-center justify-center">
            <span className="text-2xl">🏠</span>
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg">Build Your Trust Profile</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Start building your rental reputation to unlock better opportunities
            </p>
          </div>
          <a 
            href="/trust" 
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all text-sm font-medium"
          >
            Get Started
          </a>
        </div>
      </div>
    )
  }

  const getScoreColor = (score: number, maxScore: number = 100) => {
    const percentage = (score / maxScore) * 100
    if (percentage >= 80) return 'text-green-600 dark:text-green-400'
    if (percentage >= 60) return 'text-yellow-600 dark:text-yellow-400'
    if (percentage >= 40) return 'text-orange-600 dark:text-orange-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getGradientColor = (score: number, maxScore: number = 100) => {
    const percentage = (score / maxScore) * 100
    if (percentage >= 80) return 'from-green-500 to-green-600'
    if (percentage >= 60) return 'from-yellow-500 to-yellow-600'
    if (percentage >= 40) return 'from-orange-500 to-orange-600'
    return 'from-red-500 to-red-600'
  }

  const getScoreLabel = (score: number, maxScore: number = 100) => {
    const percentage = (score / maxScore) * 100
    if (percentage >= 80) return 'Excellent'
    if (percentage >= 60) return 'Good'
    if (percentage >= 40) return 'Fair'
    return 'Needs Improvement'
  }

  const primaryScore = trustSummary.userType === 'tenant' || trustSummary.userType === 'both' 
    ? { score: trustSummary.tenantScore, maxScore: 850, type: 'tenant' }
    : { score: trustSummary.landlordScore, maxScore: 100, type: 'landlord' }

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-6">
      <div className="flex items-center gap-4 mb-4">
        <div className={`w-14 h-14 bg-gradient-to-br ${getGradientColor(primaryScore.score, primaryScore.maxScore)} rounded-xl flex items-center justify-center text-white`}>
          <span className="text-2xl">⭐</span>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-lg">Trust Score</h3>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              trustSummary.userType === 'tenant' ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300' :
              trustSummary.userType === 'landlord' ? 'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300' :
              'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-300'
            }`}>
              {trustSummary.userType === 'both' ? 'Dual Profile' : 
               trustSummary.userType.charAt(0).toUpperCase() + trustSummary.userType.slice(1)}
            </span>
          </div>
          <div className="flex items-center gap-4">
            {trustSummary.userType === 'tenant' || trustSummary.userType === 'both' ? (
              <div className="flex items-center gap-2">
                <span className="text-blue-500">👤</span>
                <span className={`font-bold ${getScoreColor(trustSummary.tenantScore, 850)}`}>
                  {trustSummary.tenantScore}
                </span>
                <span className="text-gray-500 text-sm">/ 850</span>
              </div>
            ) : null}
            {trustSummary.userType === 'landlord' || trustSummary.userType === 'both' ? (
              <div className="flex items-center gap-2">
                <span className="text-purple-500">🏢</span>  
                <span className={`font-bold ${getScoreColor(trustSummary.landlordScore)}`}>
                  {trustSummary.landlordScore}
                </span>
                <span className="text-gray-500 text-sm">/ 100</span>
              </div>
            ) : null}
          </div>
        </div>
        <div className="text-right">
          <div className={`text-sm font-medium mb-2 ${getScoreColor(primaryScore.score, primaryScore.maxScore)}`}>
            {getScoreLabel(primaryScore.score, primaryScore.maxScore)}
          </div>
          <button 
            onClick={() => window.location.href = '/trust'}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors text-white"
          >
            View Profile
          </button>
        </div>
      </div>
      
      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4 pt-4 border-t border-neutral-200 dark:border-neutral-700">
        {trustSummary.userType === 'tenant' || trustSummary.userType === 'both' ? (
          <>
            <div className="text-center">
              <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{trustSummary.totalPayments}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Payments Made</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-green-600 dark:text-green-400">{trustSummary.onTimePercentage}%</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">On-time Rate</div>
            </div>
          </>
        ) : null}
        {trustSummary.userType === 'landlord' && (
          <div className="text-center">
            <div className="text-lg font-bold text-purple-600 dark:text-purple-400">{trustSummary.propertiesManaged}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Properties</div>
          </div>
        )}
        <div className="text-center">
          <div className="text-lg font-bold text-gray-600 dark:text-gray-400">
            {new Date(trustSummary.lastUpdated).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">Last Updated</div>
        </div>
      </div>
    </div>
  )
}