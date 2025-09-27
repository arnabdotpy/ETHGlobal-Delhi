import React, { useState, useEffect } from 'react'
import { getTrustData, updateTenantBehavioralScore } from '../lib/trust-data'
import { ComprehensiveTrustData } from '../lib/trust-types'

interface LandlordDashboardProps {
  userAddress: string
  listings: any[]
  onRefresh: () => void
}

interface TenantInfo {
  address: string
  propertyId: string
  trustData: ComprehensiveTrustData | null
  propertyName: string
  monthlyRent: string
}

export default function LandlordDashboard({ userAddress, listings, onRefresh }: LandlordDashboardProps) {
  const [tenants, setTenants] = useState<TenantInfo[]>([])
  const [selectedTenant, setSelectedTenant] = useState<TenantInfo | null>(null)
  const [showActionModal, setShowActionModal] = useState(false)
  const [actionType, setActionType] = useState<'late_payment' | 'property_damage' | 'noise_complaint' | 'eviction' | null>(null)

  useEffect(() => {
    // Get all tenants from user's properties
    const userProperties = listings.filter(l => 
      l.landlord.toLowerCase() === userAddress.toLowerCase() && 
      l.tenant !== '0x0000000000000000000000000000000000000000'
    )

    const tenantList: TenantInfo[] = userProperties.map(property => ({
      address: property.tenant,
      propertyId: property.id.toString(),
      trustData: getTrustData(property.tenant),
      propertyName: `Property #${property.id}`,
      monthlyRent: property.monthlyRent.toString()
    }))

    setTenants(tenantList)
  }, [listings, userAddress])

  const handleTenantAction = async (action: string) => {
    if (!selectedTenant) return

    try {
      switch (action) {
        case 'late_payment':
          // Reduce payment score
          updateTenantBehavioralScore(selectedTenant.address, 'compliance', 
            Math.max(0, (selectedTenant.trustData?.tenantData?.leaseComplianceScore || 85) - 10))
          break
        case 'property_damage':
          // Reduce maintenance score
          updateTenantBehavioralScore(selectedTenant.address, 'maintenance', 
            Math.max(0, (selectedTenant.trustData?.tenantData?.propertyMaintenanceScore || 85) - 15))
          break
        case 'noise_complaint':
          // Reduce compliance score
          updateTenantBehavioralScore(selectedTenant.address, 'compliance', 
            Math.max(0, (selectedTenant.trustData?.tenantData?.leaseComplianceScore || 85) - 5))
          break
        case 'eviction':
          // Significantly reduce all scores
          updateTenantBehavioralScore(selectedTenant.address, 'maintenance', 
            Math.max(0, (selectedTenant.trustData?.tenantData?.propertyMaintenanceScore || 85) - 25))
          updateTenantBehavioralScore(selectedTenant.address, 'compliance', 
            Math.max(0, (selectedTenant.trustData?.tenantData?.leaseComplianceScore || 85) - 30))
          updateTenantBehavioralScore(selectedTenant.address, 'communication', 
            Math.max(0, (selectedTenant.trustData?.tenantData?.communicationScore || 85) - 20))
          break
      }

      // Refresh tenant data
      const updatedTenants = tenants.map(t => 
        t.address === selectedTenant.address 
          ? { ...t, trustData: getTrustData(t.address) }
          : t
      )
      setTenants(updatedTenants)
      
      setShowActionModal(false)
      setSelectedTenant(null)
      setActionType(null)
      
      alert(`Action "${action.replace('_', ' ')}" recorded for tenant`)
    } catch (error) {
      console.error('Error recording tenant action:', error)
      alert('Failed to record action')
    }
  }

  const formatAddress = (address: string) => `${address.slice(0, 6)}...${address.slice(-4)}`
  
  const getTrustScoreColor = (score: number) => {
    if (score >= 700) return 'text-green-400'
    if (score >= 600) return 'text-yellow-400'
    if (score >= 500) return 'text-orange-400'
    return 'text-red-400'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Tenant Management</h2>
        <button
          onClick={onRefresh}
          className="px-3 py-1 text-sm bg-neutral-800 hover:bg-neutral-700 rounded transition-colors"
        >
          ↻ Refresh
        </button>
      </div>

      {tenants.length === 0 ? (
        <div className="text-center py-8 text-neutral-400">
          <div className="text-4xl mb-4">🏠</div>
          <p>No active tenants found</p>
          <p className="text-sm mt-2">Properties with tenants will appear here</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {tenants.map((tenant, index) => (
            <div key={index} className="bg-neutral-900 rounded-lg border border-neutral-800 p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="font-semibold">{tenant.propertyName}</div>
                  <div className="text-sm text-neutral-400 font-mono">
                    Tenant: {formatAddress(tenant.address)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-neutral-400">Monthly Rent</div>
                  <div className="font-mono">{(Number(tenant.monthlyRent) / 1e18).toFixed(4)} ETH</div>
                </div>
              </div>

              {tenant.trustData?.tenantData ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  <div className="text-center p-2 bg-neutral-800 rounded">
                    <div className={`font-bold ${getTrustScoreColor(tenant.trustData.tenantData.trustScore)}`}>
                      {tenant.trustData.tenantData.trustScore}
                    </div>
                    <div className="text-xs text-neutral-400">Trust Score</div>
                  </div>
                  <div className="text-center p-2 bg-neutral-800 rounded">
                    <div className="font-bold text-blue-400">
                      {tenant.trustData.tenantData.onTimePaymentPercentage}%
                    </div>
                    <div className="text-xs text-neutral-400">On-Time</div>
                  </div>
                  <div className="text-center p-2 bg-neutral-800 rounded">
                    <div className="font-bold text-purple-400">
                      {tenant.trustData.tenantData.propertyMaintenanceScore}
                    </div>
                    <div className="text-xs text-neutral-400">Property Care</div>
                  </div>
                  <div className="text-center p-2 bg-neutral-800 rounded">
                    <div className="font-bold text-teal-400">
                      {tenant.trustData.tenantData.monthlyPaymentRecords.length}
                    </div>
                    <div className="text-xs text-neutral-400">Payments</div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-neutral-500">
                  <div className="text-sm">No trust data available</div>
                </div>
              )}

              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => {
                    setSelectedTenant(tenant)
                    setActionType('late_payment')
                    setShowActionModal(true)
                  }}
                  className="px-3 py-1 text-xs bg-yellow-600/20 text-yellow-400 hover:bg-yellow-600/30 rounded transition-colors"
                >
                  Report Late Payment
                </button>
                <button
                  onClick={() => {
                    setSelectedTenant(tenant)
                    setActionType('property_damage')
                    setShowActionModal(true)
                  }}
                  className="px-3 py-1 text-xs bg-orange-600/20 text-orange-400 hover:bg-orange-600/30 rounded transition-colors"
                >
                  Report Damage
                </button>
                <button
                  onClick={() => {
                    setSelectedTenant(tenant)
                    setActionType('noise_complaint')
                    setShowActionModal(true)
                  }}
                  className="px-3 py-1 text-xs bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 rounded transition-colors"
                >
                  Noise Complaint
                </button>
                <button
                  onClick={() => {
                    setSelectedTenant(tenant)
                    setActionType('eviction')
                    setShowActionModal(true)
                  }}
                  className="px-3 py-1 text-xs bg-red-600/20 text-red-400 hover:bg-red-600/30 rounded transition-colors"
                >
                  Eviction Process
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Action Confirmation Modal */}
      {showActionModal && selectedTenant && actionType && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-neutral-900 rounded-lg border border-neutral-700 p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Confirm Action</h3>
            <p className="text-neutral-300 mb-4">
              Are you sure you want to report <strong>{actionType.replace('_', ' ')}</strong> for tenant{' '}
              <span className="font-mono">{formatAddress(selectedTenant.address)}</span>?
            </p>
            <p className="text-sm text-neutral-400 mb-6">
              This will affect their trust score and rental history.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowActionModal(false)
                  setSelectedTenant(null)
                  setActionType(null)
                }}
                className="flex-1 px-4 py-2 bg-neutral-700 hover:bg-neutral-600 rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleTenantAction(actionType)}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 rounded transition-colors"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}