import React, { useEffect, useState } from 'react'
import { getReadContracts, getWriteContracts } from '../lib/contracts'
import { currentAddress } from '../lib/eth'
import { UserNFTData } from '../lib/hedera'
import UserProfileNFT from '../components/UserProfileNFT'
import { getRandomSample } from '../lib/sample-data'

// Utility functions for HBAR conversion
const weiToHbar = (wei: bigint): string => {
  const hbar = Number(wei) / 1e18
  return hbar.toFixed(4)
}

const hbarToWei = (hbar: string): string => {
  const wei = parseFloat(hbar) * 1e18
  return Math.floor(wei).toString()
}

type Listing = {
  id: bigint
  landlord: string
  monthlyRent: bigint
  deposit: bigint
  metadataURI: string
  active: boolean
  tenant: string
}

interface HomeProps {
  userNFT: UserNFTData | null
  userAddress: string | null
}

export default function Home({ userNFT, userAddress }: HomeProps) {
  const [listings, setListings] = useState<Listing[]>([])
  const [form, setForm] = useState({ 
    name: '',
    location: '',
    rent: '', 
    deposit: '', 
    uri: '' 
  })
  const [busy, setBusy] = useState(false)
  const [selectedLandlord, setSelectedLandlord] = useState<string | null>(null)

  const [loadingListings, setLoadingListings] = useState(true)

  async function refresh() {
    try {
      setLoadingListings(true)
      
      // Try to ensure we're on the correct network, but don't block if it fails
      try {
        const { ensureCorrectNetwork } = await import('../lib/eth')
        await ensureCorrectNetwork()
      } catch (networkError: any) {
        console.warn('Network validation failed, continuing with current network:', networkError?.message || networkError)
      }
      
      const { hub } = getReadContracts()
      
      // Debug: Check if contract exists
      const provider = hub.runner
      if (provider && 'getCode' in provider) {
        const contractCode = await (provider as any).getCode(await hub.getAddress())
        console.log('Contract address:', await hub.getAddress())
        console.log('Contract code length:', contractCode.length)
        console.log('Contract code:', contractCode.substring(0, 100) + '...')
        
        if (contractCode === '0x') {
          console.error('No contract found at address:', await hub.getAddress())
          throw new Error('BriqHub contract not found at the specified address. Please check the deployment.')
        }
      }
      
      const count: bigint = await hub.listingCount()
      const out: Listing[] = []
      
      console.log(`Fetching ${count.toString()} listings...`)
      
      for (let i = 0n; i < count; i++) {
        const l = await hub.getListing(i)
        out.push({
          id: i,
          landlord: l.landlord,
          monthlyRent: l.monthlyRent,
          deposit: l.deposit,
          metadataURI: l.metadataURI,
          active: l.active,
          tenant: l.tenant,
        })
      }
      setListings(out.reverse()) // Show newest first
      console.log(`Loaded ${out.length} listings`)
    } catch (e) { 
      console.error('Error fetching listings:', e)
    } finally {
      setLoadingListings(false)
    }
  }

  useEffect(() => { 
    refresh()
  }, [])

  async function addListing(e: React.FormEvent) {
    e.preventDefault()
    
    if (!form.name.trim() || !form.location.trim() || !form.rent || !form.deposit) {
      alert('Please fill in all required fields')
      return
    }
    
    setBusy(true)
    try {
      // Ensure we're on the correct network before proceeding
      const { ensureCorrectNetwork } = await import('../lib/eth')
      await ensureCorrectNetwork()
      // Create metadata URI with property details
      const propertyMetadata = {
        name: form.name.trim(),
        location: form.location.trim(),
        description: `Property listing: ${form.name} located at ${form.location}`,
        image: form.uri || `https://api.dicebear.com/7.x/shapes/svg?seed=${form.name}`,
        attributes: [
          { trait_type: "Property Name", value: form.name },
          { trait_type: "Location", value: form.location },
          { trait_type: "Monthly Rent (HBAR)", value: form.rent },
          { trait_type: "Deposit (HBAR)", value: form.deposit },
          { trait_type: "Created Date", value: new Date().toISOString() }
        ]
      }
      
      // Convert HBAR to wei for smart contract
      const rentWei = hbarToWei(form.rent)
      const depositWei = hbarToWei(form.deposit)
      
      const metadataUri = `data:application/json;base64,${btoa(JSON.stringify(propertyMetadata))}`
      
      const { hub } = await getWriteContracts()
      const tx = await hub.createListing(
        BigInt(rentWei),
        BigInt(depositWei),
        metadataUri
      )
      await tx.wait()
      
      setForm({ name: '', location: '', rent: '', deposit: '', uri: '' })
      refresh()
      alert('Property listed successfully!')
    } catch (e: any) { 
      console.error('Error creating listing:', e)
      alert('Failed to create listing: ' + (e.message || 'Unknown error'))
    } finally { setBusy(false) }
  }

  async function rent(id: bigint, deposit: bigint) {
    setBusy(true)
    try {
      const { hub } = await getWriteContracts()
      const tx = await hub.rent(id, { value: deposit })
      await tx.wait()
      refresh()
    } catch (e: any) { 
      console.error('Error renting property:', e)
      alert('Failed to rent property: ' + (e.message || 'Unknown error'))
    } finally { setBusy(false) }
  }

  // Function to parse metadata URI
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
    <div className="space-y-6">
      {/* User Profile NFT Display */}
      {userNFT && userAddress && (
        <UserProfileNFT nftData={userNFT} userAddress={userAddress} />
      )}
      
      {/* Landlord Trust Modal */}
      {selectedLandlord && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-neutral-900 rounded-lg border border-neutral-700 p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Landlord Trust Score</h2>
              <button 
                onClick={() => setSelectedLandlord(null)}
                className="text-neutral-400 hover:text-white text-xl"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-3xl mb-2">🏆</div>
                <div className="text-sm text-neutral-400 mb-2">Address</div>
                <div className="font-mono text-sm bg-neutral-800 p-2 rounded">
                  {selectedLandlord}
                </div>
              </div>
              
              <div className="bg-neutral-800 p-4 rounded-lg">
                <h3 className="font-semibold mb-3">Trust Metrics</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Properties Listed:</span>
                    <span className="text-green-400">{listings.filter(l => l.landlord === selectedLandlord).length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Active Rentals:</span>
                    <span className="text-blue-400">{listings.filter(l => l.landlord === selectedLandlord && l.tenant !== '0x0000000000000000000000000000000000000000').length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Trust Score:</span>
                    <span className="text-yellow-400">⭐⭐⭐⭐⭐</span>
                  </div>
                </div>
              </div>
              
              <div className="text-xs text-neutral-400 text-center">
                Trust scores are calculated based on rental history and user feedback
              </div>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={addListing} className="grid gap-3 p-4 bg-neutral-900 rounded-lg border border-neutral-800">
        <div className="text-lg font-semibold">List a Property</div>
        {!userAddress && (
          <div className="text-amber-400 text-sm bg-amber-900/20 border border-amber-500/30 px-3 py-2 rounded">
            Please connect your wallet to create listings
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input 
            className="px-3 py-2 bg-neutral-800 rounded disabled:opacity-50" 
            placeholder="Property Name *" 
            value={form.name} 
            onChange={e=>setForm({...form, name:e.target.value})}
            disabled={!userAddress}
            required
          />
          <input 
            className="px-3 py-2 bg-neutral-800 rounded disabled:opacity-50" 
            placeholder="Location *" 
            value={form.location} 
            onChange={e=>setForm({...form, location:e.target.value})}
            disabled={!userAddress}
            required
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="relative">
            <input 
              type="number"
              step="0.0001"
              className="px-3 py-2 bg-neutral-800 rounded disabled:opacity-50 w-full" 
              placeholder="Monthly Rent *" 
              value={form.rent} 
              onChange={e=>setForm({...form, rent:e.target.value})}
              disabled={!userAddress}
              required
            />
            <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-400 text-sm">HBAR</span>
          </div>
          <div className="relative">
            <input 
              type="number"
              step="0.0001"
              className="px-3 py-2 bg-neutral-800 rounded disabled:opacity-50 w-full" 
              placeholder="Security Deposit *" 
              value={form.deposit} 
              onChange={e=>setForm({...form, deposit:e.target.value})}
              disabled={!userAddress}
              required
            />
            <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-400 text-sm">HBAR</span>
          </div>
        </div>
        
        <input 
          className="px-3 py-2 bg-neutral-800 rounded disabled:opacity-50" 
          placeholder="Property Image URL (optional)" 
          value={form.uri} 
          onChange={e=>setForm({...form, uri:e.target.value})}
          disabled={!userAddress}
        />
        
        <div className="flex gap-2">
          <button 
            disabled={busy || !userAddress} 
            className="flex-1 px-3 py-2 rounded bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-700"
          >
            {busy ? 'Creating Listing...' : 'List Property'}
          </button>
          
          <button 
            type="button"
            onClick={() => setForm(getRandomSample())}
            disabled={!userAddress}
            className="px-3 py-2 rounded bg-neutral-700 hover:bg-neutral-600 disabled:opacity-50 text-sm"
          >
            📝 Sample
          </button>
        </div>
      </form>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Property Listings</h2>
        <button
          onClick={() => refresh()}
          disabled={loadingListings}
          className="px-3 py-1 text-sm bg-neutral-800 hover:bg-neutral-700 rounded disabled:opacity-50"
        >
          {loadingListings ? '↻ Loading...' : '↻ Refresh'}
        </button>
      </div>

      <div className="grid gap-4">
        {loadingListings ? (
          <div className="text-center py-8 text-neutral-400">
            <div className="text-4xl mb-4">⏳</div>
            <p>Loading property listings...</p>
          </div>
        ) : listings.length === 0 ? (
          <div className="text-center py-8 text-neutral-400">
            <div className="text-4xl mb-4">🏠</div>
            <p>No property listings available yet.</p>
            <p className="text-sm mt-2">Be the first to list a property!</p>
          </div>
        ) : (
          listings.map(l => {
            const metadata = parseMetadata(l.metadataURI)
            return (
              <div key={l.id.toString()} className="p-6 bg-neutral-900 rounded-lg border border-neutral-800 hover:border-neutral-700 transition-colors">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm opacity-70">#{l.id.toString()}</span>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        l.active 
                          ? (l.tenant === '0x0000000000000000000000000000000000000000' ? 'bg-green-900 text-green-300' : 'bg-yellow-900 text-yellow-300')
                          : 'bg-red-900 text-red-300'
                      }`}>
                        {l.active ? (l.tenant === '0x0000000000000000000000000000000000000000' ? 'Available' : 'Occupied') : 'Closed'}
                      </span>
                    </div>
                    <h3 className="text-xl font-semibold mb-2">{metadata?.name || 'Property Listing'}</h3>
                    <p className="text-neutral-300 mb-3">📍 {metadata?.location || 'Location not specified'}</p>
                  </div>
                  {metadata?.image && (
                    <img 
                      src={metadata.image} 
                      alt={metadata.name || 'Property'}
                      className="w-20 h-20 rounded-lg object-cover ml-4"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none'
                      }}
                    />
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-neutral-800 p-3 rounded">
                    <div className="text-xs text-neutral-400 mb-1">Monthly Rent</div>
                    <div className="text-lg font-semibold text-green-400">{weiToHbar(l.monthlyRent)} HBAR</div>
                  </div>
                  <div className="bg-neutral-800 p-3 rounded">
                    <div className="text-xs text-neutral-400 mb-1">Security Deposit</div>
                    <div className="text-lg font-semibold text-blue-400">{weiToHbar(l.deposit)} HBAR</div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-neutral-400">Landlord:</span>
                    <button
                      onClick={() => setSelectedLandlord(l.landlord)}
                      className="text-sm text-indigo-400 hover:text-indigo-300 underline"
                    >
                      {l.landlord.slice(0,6)}...{l.landlord.slice(-4)}
                    </button>
                    <button
                      onClick={() => setSelectedLandlord(l.landlord)}
                      className="text-xs bg-indigo-600 hover:bg-indigo-700 px-2 py-1 rounded transition-colors"
                    >
                      View Trust
                    </button>
                  </div>
                  
                  {l.active && l.tenant === '0x0000000000000000000000000000000000000000' && (
                    <button 
                      disabled={busy || !userAddress || l.landlord.toLowerCase() === userAddress?.toLowerCase()} 
                      onClick={()=>rent(l.id, l.deposit)} 
                      className="px-4 py-2 rounded bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-teal-700 transition-colors"
                    >
                      {busy ? 'Processing...' : 
                       !userAddress ? 'Connect Wallet to Rent' : 
                       l.landlord.toLowerCase() === userAddress?.toLowerCase() ? 'Your Property' :
                       `Rent for ${weiToHbar(l.deposit)} HBAR`}
                    </button>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}