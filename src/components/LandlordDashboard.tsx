import React from 'react'
import TenantManagement from './TenantManagement'

interface LandlordDashboardProps {
  userAddress: string
  listings: any[]
  onRefresh: () => void
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
  return (
    <div className="space-y-8">
      {/* Properties Overview */}
      <div className="bg-neutral-900/30 rounded-lg p-6 border border-neutral-800">
        <PropertiesOverview userAddress={userAddress} listings={listings} />
      </div>

      {/* Professional Tenant Management */}
      <TenantManagement 
        userAddress={userAddress}
        listings={listings}
        onRefresh={onRefresh}
      />

      {/* Landlord Tips */}
      <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg p-4">
        <h3 className="font-semibold mb-2">💡 Landlord Tips</h3>
        <ul className="text-sm text-neutral-400 space-y-1">
          <li>• Document all tenant interactions and payments for better trust scores</li>
          <li>• Respond promptly to maintenance requests to build good reputation</li>
          <li>• Fair deposit returns improve your landlord trust rating</li>
          <li>• Professional communication enhances tenant satisfaction</li>
        </ul>
      </div>
    </div>
  )
}