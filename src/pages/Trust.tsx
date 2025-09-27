import React, { useEffect, useState } from 'react'
import { currentAddress } from '../lib/eth'
import { getTrustData } from '../lib/trust-data'
import { ComprehensiveTrustData } from '../lib/trust-types'
import TrustScoreDisplay from '../components/TrustScoreDisplay'
import TrustOnboarding from '../components/TrustOnboarding'
import TrustDemoActions from '../components/TrustDemoActions'
import HederaDebugPanel from '../components/HederaDebugPanel'

export default function Trust() {
  const [userAddress, setUserAddress] = useState<string | null>(null)
  const [trustData, setTrustData] = useState<ComprehensiveTrustData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const loadTrustData = async () => {
    try {
      const address = await currentAddress()
      setUserAddress(address)
      
      if (address) {
        const trust = getTrustData(address)
        setTrustData(trust)
      } else {
        setTrustData(null)
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
      <HederaDebugPanel />
      
      {trustData ? (
        <>
          <TrustScoreDisplay trustData={trustData} />
          <TrustDemoActions 
            userAddress={userAddress} 
            onDataUpdated={loadTrustData}
          />
        </>
      ) : (
        <TrustOnboarding 
          userAddress={userAddress} 
          onComplete={loadTrustData}
        />
      )}
    </div>
  )
}