import React, { useState, useEffect } from 'react'
import { getTrustData, updateTenantBehavioralScore } from '../lib/trust-data'
import { ComprehensiveTrustData } from '../lib/trust-types'
import TenantManagement from './TenantManagement'

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

// Properties Overview Component
function PropertiesOverview({ userAddress, listings }: { userAddress: string, listings: any[] }) {
  const myProperties = listings.filter(l => l.landlord.toLowerCase() === userAddress.toLowerCase())
  const availableProperties = myProperties.filter(p => p.active && p.tenant === '0x0000000000000000000000000000000000000000')
  const rentedProperties = myProperties.filter(p => p.tenant !== '0x0000000000000000000000000000000000000000')
  const inactiveProperties = myProperties.filter(p => !p.active)

  const weiToHbar = (wei: bigint): string => {
    const hbar = Number(wei) / 1e18
    return hbar.toFixed(4)
  }

  const parseMetadata = (metadataURI: string) => {
    try {
      if (metadataURI.startsWith('data:application/json;base64,')) {
        const base64Data = metadataURI.split(',')[1]
        return JSON.parse(atob(base64Data))
      } else if (metadataURI.startsWith('data:application/json,')) {
        const jsonData = decodeURIComponent(metadataURI.split(',')[1])
        return JSON.parse(jsonData)
      }
      return null
    } catch {
      return null
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Your Properties</h3>
        <div className="flex gap-4 text-sm text-neutral-400">
          <span>{myProperties.length} Total</span>
          <span className="text-green-400">{availableProperties.length} Available</span>
          <span className="text-blue-400">{rentedProperties.length} Rented</span>
          {inactiveProperties.length > 0 && <span className="text-yellow-400">{inactiveProperties.length} Inactive</span>}
        </div>
      </div>

      {myProperties.length === 0 ? (
        <div className="text-center py-6 text-neutral-400">
          <div className="text-3xl mb-2">🏠</div>
          <p>No properties listed yet</p>
          <p className="text-sm mt-1">Use the form above to list your first property</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {myProperties.map(property => {
            const metadata = parseMetadata(property.metadataURI)
            const isRented = property.tenant !== '0x0000000000000000000000000000000000000000'
            const isActive = property.active

            return (
              <div 
                key={property.id.toString()} 
                className={`bg-neutral-800/50 rounded-lg border p-3 ${
                  isRented ? 'border-blue-500/30' : isActive ? 'border-green-500/30' : 'border-yellow-500/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">
                        {metadata?.name || `Property #${property.id}`}
                      </h4>
                      
                      {/* Status Badge */}
                      {isRented ? (
                        <span className="px-2 py-1 bg-blue-600/20 text-blue-400 text-xs rounded">
                          Rented
                        </span>
                      ) : isActive ? (
                        <span className="px-2 py-1 bg-green-600/20 text-green-400 text-xs rounded">
                          Available
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-yellow-600/20 text-yellow-400 text-xs rounded">
                          Inactive
                        </span>
                      )}
                    </div>
                    
                    {metadata?.location && (
                      <div className="text-sm text-neutral-400 mb-1">
                        📍 {metadata.location}
                      </div>
                    )}
                    
                    <div className="flex gap-4 text-sm">
                      <span className="text-neutral-300">
                        Rent: {weiToHbar(property.monthlyRent)} HBAR
                      </span>
                      <span className="text-neutral-300">
                        Deposit: {weiToHbar(property.deposit)} HBAR
                      </span>
                    </div>
                    
                    {isRented && (
                      <div className="text-xs text-blue-400 mt-1">
                        Tenant: {property.tenant.slice(0, 6)}...{property.tenant.slice(-4)}
                      </div>
                    )}
                  </div>
                  
                  {metadata?.image && (
                    <img 
                      src={metadata.image} 
                      alt="Property" 
                      className="w-12 h-12 rounded border border-neutral-600 ml-3"
                    />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function LandlordDashboard({ userAddress, listings, onRefresh }: LandlordDashboardProps) {

  useEffect(() => {
    // Get ALL landlord properties
    const userProperties = listings.filter(l => 
      l.landlord.toLowerCase() === userAddress.toLowerCase()
    )

    // Only create tenant list for properties that have tenants
    const tenantList: TenantInfo[] = userProperties
      .filter(property => property.tenant !== '0x0000000000000000000000000000000000000000')
      .map(property => ({
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
        <h2 className="text-xl font-bold">Property Management</h2>
        <button
          onClick={onRefresh}
          className="px-3 py-1 text-sm bg-neutral-800 hover:bg-neutral-700 rounded transition-colors"
        >
          ↻ Refresh
        </button>
      </div>

      {/* Properties Overview */}
      <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg p-4">
        <PropertiesOverview userAddress={userAddress} listings={listings} />
      </div>

      {/* Tenant Management Section */}
      <div>
        <h3 className="font-semibold mb-4">Active Tenants</h3>
        {tenants.length === 0 ? (
          <div className="text-center py-6 text-neutral-400 bg-neutral-900/30 rounded-lg">
            <div className="text-3xl mb-2">👥</div>
            <p>No active tenants</p>
            <p className="text-sm mt-1">Rented properties with tenants will appear here</p>
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
    </div>
  )
}