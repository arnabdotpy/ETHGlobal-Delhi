import React, { useEffect, useState } from 'react'
import { currentAddress } from '../lib/eth'
import { getTrustData } from '../lib/trust-data'
import { ComprehensiveTrustData } from '../lib/trust-types'
import TrustScoreDisplay from '../components/TrustScoreDisplay'
import TrustOnboarding from '../components/TrustOnboarding'
import { getUserRole, UserRole } from '../lib/user-role'

export default function Trust() {
  const [userAddress, setUserAddress] = useState<string | null>(null)
  const [trustData, setTrustData] = useState<ComprehensiveTrustData | null>(null)
  const [userRole, setUserRole] = useState<UserRole | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const loadTrustData = async () => {
    try {
      const address = await currentAddress()
      setUserAddress(address)
      
      if (address) {
        // Get user role from the role system
        const role = getUserRole(address)
        setUserRole(role)
        
        const trust = getTrustData(address)
        setTrustData(trust)
        
        // If user has a role but no trust data, create trust data based on role
        if (role && !trust) {
          const { initializeTrustData } = await import('../lib/trust-data')
          const newTrustData = initializeTrustData(address, role)
          setTrustData(newTrustData)
        }
      } else {
        setTrustData(null)
        setUserRole(null)
      }
    } catch (error) {
      console.error('Error loading trust data:', error)
      setTrustData(null)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadTrustData()
    
    // Refresh data periodically
    const interval = setInterval(loadTrustData, 10000)
    return () => clearInterval(interval)
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading trust profile...</p>
        </div>
      </div>
    )
  }

  if (!userAddress) {
    return (
      <div className="max-w-md mx-auto mt-16">
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-8 text-center">
          <div className="text-4xl mb-4">🔗</div>
          <h2 className="text-xl font-semibold mb-2">Connect Your Wallet</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Please connect your wallet to view your trust profile and build your rental reputation.
          </p>
          <div className="p-4 bg-blue-50 dark:bg-blue-500/10 rounded-lg border border-blue-200 dark:border-blue-500/20">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              💡 Your trust profile helps you get better rental opportunities by building credibility through verified rental history.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {trustData ? (
        <TrustScoreDisplay trustData={trustData} />
      ) : userRole ? (
        /* User has role but no trust data - create it automatically */
        <div className="bg-blue-50 dark:bg-blue-500/10 rounded-xl border border-blue-200 dark:border-blue-500/20 p-8 text-center">
          <div className="text-4xl mb-4">⚡</div>
          <h2 className="text-xl font-semibold mb-2">Setting up your Trust Profile</h2>
          <p className="text-blue-700 dark:text-blue-300 mb-4">
            Based on your role as a <span className="font-semibold capitalize">{userRole}</span>, 
            we're initializing your trust profile...
          </p>
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      ) : (
        /* User has no role - show onboarding */
        <div className="bg-amber-50 dark:bg-amber-500/10 rounded-xl border border-amber-200 dark:border-amber-500/20 p-8 text-center">
          <div className="text-4xl mb-4">🏠</div>
          <h2 className="text-xl font-semibold mb-2">Complete Your Profile Setup</h2>
          <p className="text-amber-700 dark:text-amber-300 mb-4">
            Please go back to the Home page to select your role (Tenant or Landlord) before setting up your trust profile.
          </p>
          <a
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors"
          >
            <span>←</span>
            Go to Home Page
          </a>
        </div>
      )}
    </div>
  )
}