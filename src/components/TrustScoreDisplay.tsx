import React, { useState } from 'react'
import { ComprehensiveTrustData } from '../lib/trust-types'

interface TrustScoreDisplayProps {
  trustData: ComprehensiveTrustData
}

export default function TrustScoreDisplay({ trustData }: TrustScoreDisplayProps) {
  const [activeTab, setActiveTab] = useState<'tenant' | 'landlord'>(
    trustData.userType === 'landlord' ? 'landlord' : 'tenant'
  )

  const formatScore = (score: number, maxScore: number = 100) => {
    const percentage = (score / maxScore) * 100
    let color = 'text-red-400'
    let bgColor = 'bg-red-500/10'
    if (percentage >= 80) { color = 'text-green-400'; bgColor = 'bg-green-500/10' }
    else if (percentage >= 60) { color = 'text-yellow-400'; bgColor = 'bg-yellow-500/10' }
    else if (percentage >= 40) { color = 'text-orange-400'; bgColor = 'bg-orange-500/10' }
    
    return { score, color, percentage, bgColor }
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatCurrency = (weiAmount: string) => {
    try {
      const eth = Number(BigInt(weiAmount)) / 1e18
      return `${eth.toFixed(2)} HBAR`
    } catch {
      return '0 HBAR'
    }
  }

  const getScoreGrade = (score: number, maxScore: number = 100) => {
    const percentage = (score / maxScore) * 100
    if (percentage >= 90) return 'A+'
    if (percentage >= 80) return 'A'
    if (percentage >= 70) return 'B+'
    if (percentage >= 60) return 'B'
    if (percentage >= 50) return 'C'
    return 'D'
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header with Navigation */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-t-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Trust Profile</h1>
            <p className="text-blue-100">Your reputation in the Briq ecosystem</p>
          </div>
          <div className="text-right">
            <div className="text-sm opacity-80">Last updated</div>
            <div className="font-mono text-sm">{formatDate(trustData.updatedAt)}</div>
          </div>
        </div>
        
        {/* Tab Navigation */}
        {trustData.userType === 'both' && (
          <div className="flex gap-2 mt-6">
            <button
              onClick={() => setActiveTab('tenant')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'tenant' 
                  ? 'bg-white/20 text-white' 
                  : 'bg-white/10 text-blue-200 hover:bg-white/15'
              }`}
            >
              👤 Tenant Profile
            </button>
            <button
              onClick={() => setActiveTab('landlord')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'landlord' 
                  ? 'bg-white/20 text-white' 
                  : 'bg-white/10 text-purple-200 hover:bg-white/15'
              }`}
            >
              🏢 Landlord Profile
            </button>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="bg-white dark:bg-neutral-900 rounded-b-xl border border-neutral-200 dark:border-neutral-800">
        {/* Tenant Trust Score */}
        {trustData.tenantData && (activeTab === 'tenant' || trustData.userType === 'tenant') && (
          <div className="p-6">
            {/* Main Score Circle */}
            <div className="flex items-center justify-center mb-8">
              <div className="relative">
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                  <div className="text-center text-white">
                    <div className="text-3xl font-bold">{trustData.tenantData.trustScore}</div>
                    <div className="text-xs opacity-80">/ 850</div>
                  </div>
                </div>
                <div className="absolute -top-2 -right-2 bg-blue-600 text-white px-2 py-1 rounded-full text-xs font-bold">
                  {getScoreGrade(trustData.tenantData.trustScore, 850)}
                </div>
              </div>
            </div>

            {/* Score Description */}
            <div className="text-center mb-8">
              <h3 className="text-xl font-semibold mb-2">
                {trustData.tenantData.trustScore >= 750 ? 'Excellent Tenant' :
                 trustData.tenantData.trustScore >= 650 ? 'Good Tenant' :
                 trustData.tenantData.trustScore >= 550 ? 'Fair Tenant' : 'Developing Tenant'}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Your rental reputation helps landlords trust you as a reliable tenant.
              </p>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className={`p-4 rounded-xl ${formatScore(trustData.tenantData.onTimePaymentPercentage).bgColor} border border-current/20`}>
                <div className="text-center">
                  <div className={`text-2xl font-bold ${formatScore(trustData.tenantData.onTimePaymentPercentage).color} mb-1`}>
                    {trustData.tenantData.onTimePaymentPercentage}%
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">On-time Payments</div>
                </div>
              </div>
              
              <div className={`p-4 rounded-xl ${formatScore(trustData.tenantData.propertyMaintenanceScore).bgColor} border border-current/20`}>
                <div className="text-center">
                  <div className={`text-2xl font-bold ${formatScore(trustData.tenantData.propertyMaintenanceScore).color} mb-1`}>
                    {trustData.tenantData.propertyMaintenanceScore}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Property Care</div>
                </div>
              </div>
              
              <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-1">
                    {trustData.tenantData.monthlyPaymentRecords.length}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Total Payments</div>
                </div>
              </div>
              
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-500/10 border border-gray-200 dark:border-gray-500/20">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-600 dark:text-gray-400 mb-1">
                    {formatCurrency(trustData.tenantData.totalRentPaid)}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Total Paid</div>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            {trustData.tenantData.monthlyPaymentRecords.length > 0 && (
              <div className="bg-gray-50 dark:bg-neutral-800 rounded-xl p-6">
                <h4 className="font-semibold mb-4 flex items-center gap-2">
                  <span>💳</span> Recent Payment History
                </h4>
                <div className="space-y-3">
                  {trustData.tenantData.monthlyPaymentRecords
                    .slice(-3)
                    .reverse()
                    .map((payment, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-white dark:bg-neutral-700 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${
                            payment.status === 'on-time' ? 'bg-green-400' :
                            payment.status === 'late' ? 'bg-yellow-400' : 'bg-red-400'
                          }`}></div>
                          <div>
                            <div className="font-medium">{formatCurrency(payment.amount)}</div>
                            <div className="text-sm text-gray-500">Property #{payment.propertyId}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium capitalize">{payment.status}</div>
                          <div className="text-xs text-gray-500">{formatDate(payment.paidDate)}</div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Landlord Trust Score */}
        {trustData.landlordData && (activeTab === 'landlord' || trustData.userType === 'landlord') && (
          <div className="p-6">
            {/* Main Score Circle */}
            <div className="flex items-center justify-center mb-8">
              <div className="relative">
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                  <div className="text-center text-white">
                    <div className="text-3xl font-bold">{trustData.landlordData.trustScore}</div>
                    <div className="text-xs opacity-80">/ 100</div>
                  </div>
                </div>
                <div className="absolute -top-2 -right-2 bg-purple-600 text-white px-2 py-1 rounded-full text-xs font-bold">
                  {getScoreGrade(trustData.landlordData.trustScore)}
                </div>
              </div>
            </div>

            {/* Score Description */}
            <div className="text-center mb-8">
              <h3 className="text-xl font-semibold mb-2">
                {trustData.landlordData.trustScore >= 90 ? 'Excellent Landlord' :
                 trustData.landlordData.trustScore >= 75 ? 'Good Landlord' :
                 trustData.landlordData.trustScore >= 60 ? 'Fair Landlord' : 'Developing Landlord'}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Your property management reputation helps tenants trust you as a fair landlord.
              </p>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className={`p-4 rounded-xl ${formatScore(trustData.landlordData.fairnessScore).bgColor} border border-current/20`}>
                <div className="text-center">
                  <div className={`text-2xl font-bold ${formatScore(trustData.landlordData.fairnessScore).color} mb-1`}>
                    {trustData.landlordData.fairnessScore}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Fairness Score</div>
                </div>
              </div>
              
              <div className={`p-4 rounded-xl ${formatScore(trustData.landlordData.communicationScore).bgColor} border border-current/20`}>
                <div className="text-center">
                  <div className={`text-2xl font-bold ${formatScore(trustData.landlordData.communicationScore).color} mb-1`}>
                    {trustData.landlordData.communicationScore}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Communication</div>
                </div>
              </div>
              
              <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20">
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mb-1">
                    {trustData.landlordData.propertiesManaged.length}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Properties Managed</div>
                </div>
              </div>
              
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-500/10 border border-gray-200 dark:border-gray-500/20">
                <div className="text-center">
                  <div className={`text-2xl font-bold mb-1 ${
                    trustData.landlordData.licenseStatus === 'active' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                  }`}>
                    {trustData.landlordData.licenseStatus === 'active' ? '✓' : '✗'}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">License Status</div>
                </div>
              </div>
            </div>

            {/* Management Stats */}
            <div className="bg-gray-50 dark:bg-neutral-800 rounded-xl p-6">
              <h4 className="font-semibold mb-4 flex items-center gap-2">
                <span>📊</span> Management Statistics
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Legal Compliance:</span>
                  <span className={formatScore(trustData.landlordData.legalComplianceScore).color}>
                    {trustData.landlordData.legalComplianceScore}/100
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Deposit Returns:</span>
                  <span className="font-medium">{trustData.landlordData.depositReturnHistory.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Complaints:</span>
                  <span className="font-medium">
                    {trustData.landlordData.unauthorizedEntryReports + trustData.landlordData.discriminationComplaints}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Overall Rating:</span>
                  <span className="font-medium">{trustData.landlordData.professionalismScore}/100</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}