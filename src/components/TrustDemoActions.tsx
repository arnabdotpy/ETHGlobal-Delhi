import React, { useState, useEffect } from 'react'
import { 
  initializeTrustData, 
  simulatePayment, 
  updateTenantBehavioralScore,
  updateLandlordScore,
  addTenancyRecord,
  getTrustData
} from '../lib/trust-data'
import { TenancyRecord } from '../lib/trust-types'
import { updateNFTWithTrustData } from '../lib/nft-trust-update'

interface TrustDemoActionsProps {
  userAddress: string
  onDataUpdated: () => void
}

export default function TrustDemoActions({ userAddress, onDataUpdated }: TrustDemoActionsProps) {
  const [loading, setLoading] = useState(false)
  const [showDemo, setShowDemo] = useState(false)
  const [lastAction, setLastAction] = useState<string | null>(null)

  useEffect(() => {
    if (lastAction) {
      const timer = setTimeout(() => {
        setLastAction(null)
      }, 3000) // Clear feedback after 3 seconds
      
      return () => clearTimeout(timer)
    }
  }, [lastAction])

  const handleInitializeTrustData = async (userType: 'tenant' | 'landlord' | 'both') => {
    setLoading(true)
    try {
      initializeTrustData(userAddress, userType)
      await updateNFTWithTrustData(userAddress)
      onDataUpdated()
    } catch (error) {
      console.error('Error initializing trust data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSimulatePayment = async (isOnTime: boolean) => {
    setLoading(true)
    try {
      // Ensure trust data exists before simulating payment
      const { getTrustData, initializeTrustData } = await import('../lib/trust-data')
      const { getUserRole } = await import('../lib/user-role')
      
      let trustData = getTrustData(userAddress)
      if (!trustData) {
        const userRole = getUserRole(userAddress) || 'tenant'
        trustData = initializeTrustData(userAddress, userRole)
      }
      
      const propertyId = 'demo-property-1'
      const amount = (Math.random() * 2 + 0.5).toFixed(4) // Random amount between 0.5-2.5 ETH
      const amountWei = (BigInt(Math.floor(parseFloat(amount) * 1e18))).toString()
      
      simulatePayment(userAddress, propertyId, amountWei, isOnTime)
      await updateNFTWithTrustData(userAddress)
      setLastAction(`Payment simulated (${isOnTime ? 'on-time' : 'late'}) and NFT updated!`)
      onDataUpdated()
    } catch (error) {
      console.error('Error simulating payment:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddTenancy = async () => {
    setLoading(true)
    try {
      const now = Date.now()
      const tenancyRecord: TenancyRecord = {
        propertyId: `property-${Math.floor(Math.random() * 1000)}`,
        landlordAddress: '0x' + Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
        startDate: now - (365 * 24 * 60 * 60 * 1000), // 1 year ago
        endDate: now - (30 * 24 * 60 * 60 * 1000), // 1 month ago
        monthlyRent: (BigInt(Math.floor((Math.random() * 2 + 1) * 1e18))).toString(),
        deposit: (BigInt(Math.floor((Math.random() * 4 + 2) * 1e18))).toString(),
        earlyTermination: Math.random() > 0.8,
        reasonForLeaving: Math.random() > 0.9 ? 'evicted' : 'lease-expired',
        landlordRating: Math.floor(Math.random() * 2) + 4, // 4-5 stars
        tenantRating: Math.floor(Math.random() * 2) + 4
      }
      
      addTenancyRecord(userAddress, tenancyRecord)
      await updateNFTWithTrustData(userAddress)
      onDataUpdated()
    } catch (error) {
      console.error('Error adding tenancy record:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateScore = async (scoreType: string, value: number) => {
    setLoading(true)
    try {
      const trustData = getTrustData(userAddress)
      if (!trustData) return

      if (trustData.tenantData && ['maintenance', 'communication', 'compliance'].includes(scoreType)) {
        updateTenantBehavioralScore(userAddress, scoreType as any, value)
      } else if (trustData.landlordData && ['communication', 'fairness', 'professionalism', 'dispute'].includes(scoreType)) {
        updateLandlordScore(userAddress, scoreType as any, value)
      }
      
      await updateNFTWithTrustData(userAddress)
      onDataUpdated()
    } catch (error) {
      console.error('Error updating score:', error)
    } finally {
      setLoading(false)
    }
  }

  const trustData = getTrustData(userAddress)

  if (!trustData) {
    return (
      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-6">
        <h3 className="text-xl font-semibold mb-4">🚀 Initialize Trust Profile</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Create your trust profile to start building your rental reputation on the platform.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <button
            onClick={() => handleInitializeTrustData('tenant')}
            disabled={loading}
            className="flex flex-col items-center p-4 border-2 border-blue-200 dark:border-blue-800 rounded-lg hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 disabled:opacity-50 transition-all"
          >
            <div className="text-2xl mb-2">🏠</div>
            <div className="font-medium">Tenant</div>
            <div className="text-xs text-gray-500">Looking to rent</div>
          </button>
          <button
            onClick={() => handleInitializeTrustData('landlord')}
            disabled={loading}
            className="flex flex-col items-center p-4 border-2 border-purple-200 dark:border-purple-800 rounded-lg hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-500/10 disabled:opacity-50 transition-all"
          >
            <div className="text-2xl mb-2">🏢</div>
            <div className="font-medium">Landlord</div>
            <div className="text-xs text-gray-500">Property owner</div>
          </button>
          <button
            onClick={() => handleInitializeTrustData('both')}
            disabled={loading}
            className="flex flex-col items-center p-4 border-2 border-green-200 dark:border-green-800 rounded-lg hover:border-green-400 hover:bg-green-50 dark:hover:bg-green-500/10 disabled:opacity-50 transition-all"
          >
            <div className="text-2xl mb-2">⚖️</div>
            <div className="font-medium">Both</div>
            <div className="text-xs text-gray-500">Tenant & Landlord</div>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold">🎮 Demo Actions</h3>
        <button
          onClick={() => setShowDemo(!showDemo)}
          className="px-3 py-1 text-sm bg-gray-100 dark:bg-neutral-800 hover:bg-gray-200 dark:hover:bg-neutral-700 rounded-lg transition-colors"
        >
          {showDemo ? 'Hide Demo' : 'Show Demo'}
        </button>
      </div>

      {showDemo && (
        <div className="space-y-6">
          {lastAction && (
            <div className="p-3 bg-green-50 dark:bg-green-500/10 rounded-lg border border-green-200 dark:border-green-500/20">
              <p className="text-sm text-green-700 dark:text-green-300">
                ✅ {lastAction}
              </p>
            </div>
          )}
          
          <div className="p-4 bg-amber-50 dark:bg-amber-500/10 rounded-lg border border-amber-200 dark:border-amber-500/20">
            <p className="text-sm text-amber-700 dark:text-amber-300">
              ⚠️ <strong>Demo Mode:</strong> These actions simulate real-world scenarios and update your NFT metadata with new trust data. 
              In production, these would be triggered by actual rental transactions and smart contract interactions.
            </p>
          </div>

          {trustData.tenantData && (
            <div className="space-y-4">
              <h4 className="font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-2">
                <span>🏠</span> Tenant Actions
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <button
                  onClick={() => handleSimulatePayment(true)}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-3 bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400 rounded-lg hover:bg-green-200 dark:hover:bg-green-500/20 disabled:opacity-50 transition-colors"
                >
                  <span>✅</span> Pay Rent On Time
                </button>
                <button
                  onClick={() => handleSimulatePayment(false)}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-3 bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-500/20 disabled:opacity-50 transition-colors"
                >
                  <span>⏰</span> Pay Rent Late
                </button>
                <button
                  onClick={handleAddTenancy}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-3 bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-500/20 disabled:opacity-50 transition-colors"
                >
                  <span>🏠</span> Add Past Tenancy
                </button>
                <button
                  onClick={() => handleUpdateScore('maintenance', Math.min(100, (trustData.tenantData?.propertyMaintenanceScore || 85) + 5))}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-3 bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400 rounded-lg hover:bg-green-200 dark:hover:bg-green-500/20 disabled:opacity-50 transition-colors"
                >
                  <span>🔧</span> Improve Property Care
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <button
                  onClick={() => handleUpdateScore('communication', Math.min(100, (trustData.tenantData?.communicationScore || 85) + 5))}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-3 bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400 rounded-lg hover:bg-green-200 dark:hover:bg-green-500/20 disabled:opacity-50 transition-colors"
                >
                  <span>💬</span> Better Communication
                </button>
                <button
                  onClick={() => handleUpdateScore('maintenance', Math.max(0, (trustData.tenantData?.propertyMaintenanceScore || 85) - 10))}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-3 bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-500/20 disabled:opacity-50 transition-colors"
                >
                  <span>💥</span> Property Damage
                </button>
              </div>
            </div>
          )}

          {trustData.landlordData && (
            <div className="space-y-4">
              <h4 className="font-semibold text-purple-600 dark:text-purple-400 flex items-center gap-2">
                <span>🏢</span> Landlord Actions
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <button
                  onClick={() => handleUpdateScore('fairness', Math.min(100, (trustData.landlordData?.fairnessScore || 85) + 5))}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-3 bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400 rounded-lg hover:bg-green-200 dark:hover:bg-green-500/20 disabled:opacity-50 transition-colors"
                >
                  <span>💰</span> Fair Deposit Return
                </button>
                <button
                  onClick={() => handleUpdateScore('communication', Math.min(100, (trustData.landlordData?.communicationScore || 85) + 5))}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-3 bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400 rounded-lg hover:bg-green-200 dark:hover:bg-green-500/20 disabled:opacity-50 transition-colors"
                >
                  <span>📞</span> Quick Response
                </button>
                <button
                  onClick={() => handleUpdateScore('professionalism', Math.min(100, (trustData.landlordData?.professionalismScore || 85) + 5))}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-3 bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400 rounded-lg hover:bg-green-200 dark:hover:bg-green-500/20 disabled:opacity-50 transition-colors"
                >
                  <span>🎯</span> Professional Service
                </button>
                <button
                  onClick={() => handleUpdateScore('fairness', Math.max(0, (trustData.landlordData?.fairnessScore || 85) - 15))}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-3 bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-500/20 disabled:opacity-50 transition-colors"
                >
                  <span>📋</span> Unfair Charges
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}