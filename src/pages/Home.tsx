import React, { useEffect, useState } from 'react'
import { getReadContracts, getWriteContracts } from '../lib/contracts'
import { currentAddress } from '../lib/eth'
import { UserNFTData } from '../lib/hedera'
import UserProfileNFT from '../components/UserProfileNFT'
import TrustWidget from '../components/TrustWidget'
import RoleSelectionModal from '../components/RoleSelectionModal'
import LandlordDashboard from '../components/LandlordDashboard'
import TenantDashboard from '../components/TenantDashboard'
import { getUserRole, saveUserRole, hasUserRole, UserRole } from '../lib/user-role'
import { getRandomSample } from '../lib/sample-data'
import { getTrustData } from '../lib/trust-data'

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
  const [showRoleModal, setShowRoleModal] = useState(false)
  const [userRole, setUserRole] = useState<UserRole | null>(null)

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

  useEffect(() => {
    // Check user role when address changes
    if (userAddress) {
      const role = getUserRole(userAddress)
      if (role) {
        setUserRole(role)
      } else {
        setShowRoleModal(true)
      }
    } else {
      setUserRole(null)
      setShowRoleModal(false)
    }
  }, [userAddress])

  const handleRoleSelected = (role: UserRole) => {
    if (userAddress) {
      saveUserRole(userAddress, role)
      setUserRole(role)
      setShowRoleModal(false)
      
      // Initialize trust data based on role
      const { initializeTrustData } = require('../lib/trust-data')
      initializeTrustData(userAddress, role)
    }
  }

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
      console.log('Starting rental process...')
      console.log('Property ID:', id.toString())
      console.log('Deposit required:', deposit.toString(), 'wei')
      console.log('Deposit in HBAR:', weiToHbar(deposit))
      
      // Check if user has enough balance
      const { getProvider } = await import('../lib/eth')
      const provider = getProvider()
      const balance = await provider.getBalance(userAddress!)
      console.log('User balance:', balance.toString(), 'wei')
      console.log('User balance in HBAR:', weiToHbar(balance))
      
      if (balance < deposit) {
        throw new Error(`Insufficient balance. You have ${weiToHbar(balance)} HBAR but need ${weiToHbar(deposit)} HBAR`)
      }
      
      const { hub } = await getWriteContracts()
      console.log('Executing rent transaction...')
      const tx = await hub.rent(id, { value: deposit })
      console.log('Transaction submitted:', tx.hash)
      await tx.wait()
      console.log('Transaction confirmed')
      
        // Record this as a payment in the trust system
        if (userAddress) {
          const { addPaymentRecord, getTrustData, initializeTrustData } = await import('../lib/trust-data')
          
          // Ensure user has trust data (initialize as tenant if needed)
          let trustData = getTrustData(userAddress)
          if (!trustData) {
            trustData = initializeTrustData(userAddress, 'tenant')
          }
          
          // Create payment record
          const now = Date.now()
          const paymentRecord = {
            amount: deposit.toString(),
            dueDate: now, // Immediate payment for initial rental
            paidDate: now,
            status: 'on-time' as const,
            lateDays: 0,
            propertyId: id.toString(),
            transactionHash: tx.hash
          }
          
          addPaymentRecord(userAddress, paymentRecord)
        }
      
      refresh()
      alert('Property rented successfully! Payment recorded in your trust profile.')
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
      {/* Role Selection Modal */}
      <RoleSelectionModal
        isOpen={showRoleModal}
        onRoleSelected={handleRoleSelected}
        userAddress={userAddress || ''}
      />

      {/* User Profile Section */}
      {userAddress && userRole && (
        <>
          {/* User Profile NFT Display */}
          {userNFT && (
            <UserProfileNFT nftData={userNFT} userAddress={userAddress} />
          )}
          
          {/* Trust Score Widget */}
          <TrustWidget userAddress={userAddress} />
          
          {/* Role Badge */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="text-2xl">
                  {userRole === 'landlord' ? '🏢' : '👤'}
                </div>
                <div>
                  <div className="font-semibold capitalize">{userRole}</div>
                  <div className="text-sm text-neutral-400">
                    {userRole === 'landlord' ? 'Property Owner' : 'Property Seeker'}
                  </div>
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowRoleModal(true)}
              className="px-3 py-1 text-xs bg-neutral-800 hover:bg-neutral-700 rounded transition-colors"
            >
              Change Role
            </button>
          </div>
        </>
      )}

      {/* Role-based Content */}
      {userAddress && userRole ? (
        userRole === 'landlord' ? (
          <>
            {/* Property Listing Form for Landlords */}
            <form onSubmit={addListing} className="grid gap-3 p-4 bg-neutral-900 rounded-lg border border-neutral-800">
              <div className="text-lg font-semibold">List a New Property</div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input 
                  type="text" 
                  placeholder="Property Name *" 
                  value={form.name} 
                  onChange={e=>setForm({...form, name:e.target.value})}
                  className="px-3 py-2 rounded bg-neutral-800 border border-neutral-700"
                  required
                />
                <input 
                  type="text" 
                  placeholder="Location *" 
                  value={form.location} 
                  onChange={e=>setForm({...form, location:e.target.value})}
                  className="px-3 py-2 rounded bg-neutral-800 border border-neutral-700"
                  required
                />
                <input 
                  type="number" 
                  step="0.1" 
                  placeholder="Monthly Rent (HBAR) *" 
                  value={form.rent} 
                  onChange={e=>setForm({...form, rent:e.target.value})}
                  className="px-3 py-2 rounded bg-neutral-800 border border-neutral-700"
                  required
                />
                <input 
                  type="number" 
                  step="0.1" 
                  placeholder="Security Deposit (HBAR) *" 
                  value={form.deposit} 
                  onChange={e=>setForm({...form, deposit:e.target.value})}
                  className="px-3 py-2 rounded bg-neutral-800 border border-neutral-700"
                  required
                />
              </div>
              
              <input 
                type="url" 
                placeholder="Property Image URL (optional)" 
                value={form.uri} 
                onChange={e=>setForm({...form, uri:e.target.value})}
                className="px-3 py-2 rounded bg-neutral-800 border border-neutral-700"
              />
              
              <div className="flex gap-2">
                <button 
                  disabled={busy} 
                  className="flex-1 px-3 py-2 rounded bg-neutral-700 hover:bg-neutral-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {busy ? 'Creating Listing...' : 'List Property'}
                </button>
                <button 
                  type="button"
                  onClick={() => setForm(getRandomSample())}
                  className="px-3 py-2 rounded bg-neutral-800 hover:bg-neutral-700 text-sm"
                >
                  📝 Sample
                </button>
              </div>
            </form>

            {/* Landlord Dashboard */}
            <LandlordDashboard
              userAddress={userAddress}
              listings={listings}
              onRefresh={refresh}
            />
          </>
        ) : (
          /* Tenant Dashboard */
          <TenantDashboard
            userAddress={userAddress}
            listings={listings}
            onRent={rent}
            busy={busy}
            parseMetadata={parseMetadata}
          />
        )
      ) : (
        /* Not connected */
        <div className="text-center py-12 text-neutral-400">
          <div className="text-6xl mb-4">🏠</div>
          <h2 className="text-2xl font-bold mb-2">Welcome to Briq</h2>
          <p className="mb-4">Connect your wallet to get started</p>
        </div>
      )}
    </div>
  )
}