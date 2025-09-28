import React, { useState } from 'react'
import { getTenantForProperty } from '../lib/mock-tenants'

interface TenantDashboardProps {
  userAddress: string
  listings: any[]
  onRent: (id: bigint, deposit: bigint) => void
  busy: boolean
  parseMetadata: (uri: string) => any
}

export default function TenantDashboard({ userAddress, listings, onRent, busy, parseMetadata }: TenantDashboardProps) {
  const [filterType, setFilterType] = useState<'all' | 'available' | 'affordable'>('all')
  const [maxRent, setMaxRent] = useState('')

  const weiToHbar = (wei: bigint): string => {
    const hbar = Number(wei) / 1e18
    return hbar.toFixed(4)
  }

  // Show ALL properties with different filter options for tenants
  const allProperties = listings.filter(l => 
    l.landlord.toLowerCase() !== userAddress?.toLowerCase() // Don't show own properties
  )

  const filteredProperties = allProperties.filter(property => {
    // Check if property is rented via signature-based system
    const mockTenant = getTenantForProperty(property.id.toString())
    const isRentedViaSignature = mockTenant !== null
    const isRentedViaContract = property.tenant !== '0x0000000000000000000000000000000000000000'
    const isRented = isRentedViaSignature || isRentedViaContract
    const isAvailable = property.active && !isRented

    // Apply filters based on selection
    if (filterType === 'all') {
      return true // Show all properties (available and rented)
    }
    if (filterType === 'available') {
      return isAvailable
    }
    if (filterType === 'affordable' && maxRent) {
      const rentInHbar = Number(property.monthlyRent) / 1e18
      return isAvailable && rentInHbar <= parseFloat(maxRent)
    }
    return true
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">{filterType === 'all' ? 'All Properties' : filterType === 'available' ? 'Available Properties' : 'Affordable Properties'}</h2>
        <div className="flex items-center gap-3">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="px-3 py-1 bg-neutral-800 border border-neutral-700 rounded text-sm"
          >
            <option value="all">All Properties</option>
            <option value="available">Available Only</option>
            <option value="affordable">Within Budget</option>
          </select>
          
          {filterType === 'affordable' && (
            <input
              type="number"
              step="0.1"
              placeholder="Max rent (HBAR)"
              value={maxRent}
              onChange={(e) => setMaxRent(e.target.value)}
              className="px-3 py-1 bg-neutral-800 border border-neutral-700 rounded text-sm w-32"
            />
          )}
        </div>
      </div>

      {filteredProperties.length === 0 ? (
        <div className="text-center py-8 text-neutral-400">
          <div className="text-4xl mb-4">🏠</div>
          <p>No properties available</p>
          <p className="text-sm mt-2">
            {filterType === 'affordable' ? 'Try increasing your budget' : 'Check back later for new listings'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredProperties.map(property => {
            const metadata = parseMetadata(property.metadataURI)
            const isAffordable = Number(property.monthlyRent) / 1e18 <= 100 // Consider under 100 HBAR as affordable
            
            // Check rental status (contract + signature-based)
            const mockTenant = getTenantForProperty(property.id.toString())
            const isRentedViaSignature = mockTenant !== null
            const isRentedViaContract = property.tenant !== '0x0000000000000000000000000000000000000000'
            const isRented = isRentedViaSignature || isRentedViaContract
            const isAvailable = property.active && !isRented
            
            return (
              <div 
                key={property.id.toString()} 
                className={`bg-neutral-900 rounded-lg border p-4 transition-all hover:border-neutral-600 ${
                  isAffordable ? 'border-green-500/30' : 'border-neutral-800'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-lg">
                        {metadata?.name || `Property #${property.id}`}
                      </h3>
                      
                      {/* Property Status */}
                      {isAvailable ? (
                        <span className="px-2 py-1 bg-green-600/20 text-green-400 text-xs rounded">
                          Available
                        </span>
                      ) : isRented ? (
                        <span className="px-2 py-1 bg-red-600/20 text-red-400 text-xs rounded">
                          {isRentedViaSignature ? 'Rented (Signature)' : 'Rented'}
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-yellow-600/20 text-yellow-400 text-xs rounded">
                          Inactive
                        </span>
                      )}
                      
                      {isAffordable && isAvailable && (
                        <span className="px-2 py-1 bg-blue-600/20 text-blue-400 text-xs rounded">
                          Affordable
                        </span>
                      )}
                    </div>
                    
                    {metadata?.location && (
                      <div className="text-sm text-neutral-400 mb-2">
                        📍 {metadata.location}
                      </div>
                    )}
                    
                    <div className="text-sm text-neutral-300 mb-3">
                      {metadata?.description || 'Property available for rent'}
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-neutral-400">
                      <span>Owner: {property.landlord.slice(0,6)}...{property.landlord.slice(-4)}</span>
                      {isRented && (
                        <span>Tenant: {(isRentedViaSignature ? mockTenant?.tenantAddress : property.tenant)?.slice(0,6)}...{(isRentedViaSignature ? mockTenant?.tenantAddress : property.tenant)?.slice(-4)}</span>
                      )}
                    </div>
                  </div>
                  
                  {metadata?.image && (
                    <img 
                      src={metadata.image} 
                      alt="Property" 
                      className="w-16 h-16 rounded-lg border border-neutral-700 ml-4"
                    />
                  )}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-neutral-800">
                  <div className="flex gap-6">
                    <div>
                      <div className="text-xs text-neutral-400">Monthly Rent</div>
                      <div className="font-mono font-semibold">
                        {weiToHbar(property.monthlyRent)} HBAR
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-neutral-400">Security Deposit</div>
                      <div className="font-mono font-semibold">
                        {weiToHbar(property.deposit)} HBAR
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    {isAvailable ? (
                      <button
                        onClick={() => onRent(property.id, property.deposit)}
                        disabled={busy}
                        className="px-4 py-2 bg-green-700 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors"
                      >
                        {busy ? 'Processing...' : 'Rent Property'}
                      </button>
                    ) : isRented ? (
                      <button
                        disabled
                        className="px-4 py-2 bg-neutral-800 text-neutral-500 cursor-not-allowed rounded"
                      >
                        Already Rented
                      </button>
                    ) : (
                      <button
                        disabled
                        className="px-4 py-2 bg-neutral-800 text-neutral-500 cursor-not-allowed rounded"
                      >
                        Not Available
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Rental Tips */}
      <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg p-4">
        <h3 className="font-semibold mb-2">💡 Rental Tips</h3>
        <ul className="text-sm text-neutral-400 space-y-1">
          <li>• Pay rent on time to build a strong trust score</li>
          <li>• Maintain the property well to get positive reviews</li>
          <li>• Communicate promptly with landlords</li>
          <li>• Your rental history builds your reputation for future rentals</li>
        </ul>
      </div>
    </div>
  )
}