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
      
      // Get contract listings
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
      console.log('=== RENTAL SIGNATURE PROCESS STARTED ===')
      console.log('Property ID:', id.toString())
      console.log('User address:', userAddress)
      
      if (!userAddress) {
        throw new Error('Please connect your wallet first')
      }

      // Find the property in our listings
      const property = listings.find(l => l.id === id)
      if (!property) {
        throw new Error('Property not found')
      }

      console.log('Property found:', {
        landlord: property.landlord,
        active: property.active,
        tenant: property.tenant,
        monthlyRent: property.monthlyRent.toString(),
        deposit: property.deposit.toString()
      })
      
      if (!property.active) {
        throw new Error('Property is not active')
      }
      
      if (property.tenant !== '0x0000000000000000000000000000000000000000') {
        throw new Error('Property is already rented')
      }

      // Check if already rented via signature system
      const { getTenantForProperty } = await import('../lib/mock-tenants')
      const existingTenant = getTenantForProperty(id.toString())
      if (existingTenant) {
        throw new Error('Property is already rented via signature agreement')
      }
      
      if (property.landlord.toLowerCase() === userAddress.toLowerCase()) {
        throw new Error('You cannot rent your own property')
      }
      
      // Create signature message for rental agreement  
      const { getSigner } = await import('../lib/eth')
      const signer = await getSigner()
      
      const rentalAgreement = {
        propertyId: id.toString(),
        landlord: property.landlord,
        tenant: userAddress,
        monthlyRent: property.monthlyRent.toString(),
        deposit: property.deposit.toString(),
        startDate: new Date().toISOString(),
        agreementHash: `rental_${id}_${userAddress}_${Date.now()}`
      }

      const signatureMessage = `Rental Agreement Signature:

Property ID: ${rentalAgreement.propertyId}
Landlord: ${rentalAgreement.landlord}
Tenant: ${rentalAgreement.tenant}
Monthly Rent: ${weiToHbar(BigInt(rentalAgreement.monthlyRent))} HBAR
Deposit: ${weiToHbar(BigInt(rentalAgreement.deposit))} HBAR
Start Date: ${rentalAgreement.startDate}
Agreement Hash: ${rentalAgreement.agreementHash}

By signing this message, I agree to rent this property under the terms specified above.`
      
      console.log('📝 Requesting signature for rental agreement...')
      const signature = await signer.signMessage(signatureMessage)
      console.log('✅ Rental agreement signed!')
      
      // Store the rental agreement locally
      console.log('📋 Recording rental agreement locally...')
      const { addMockTenant } = await import('../lib/mock-tenants')
      const { initializeTrustData } = await import('../lib/trust-data')
      
      addMockTenant({
        propertyId: rentalAgreement.propertyId,
        tenantAddress: rentalAgreement.tenant,
        landlordAddress: rentalAgreement.landlord,
        monthlyRent: rentalAgreement.monthlyRent,
        deposit: rentalAgreement.deposit,
        startDate: rentalAgreement.startDate,
        signature: signature
      })

      // Initialize trust data for tenant if not exists
      initializeTrustData(userAddress, 'tenant')
      
      console.log('✅ Rental agreement recorded locally for tenant management')
      
      // Import and use rental functions
      const { updateRentalNFTMetadata, recordRentalHistory } = await import('../lib/rental-signatures')
      
      // Update NFT metadata for both parties
      await updateRentalNFTMetadata(rentalAgreement, signature)
      
      // Record rental history in trust system
      await recordRentalHistory(rentalAgreement, signature)
      
      console.log('📋 Rental agreement completed with signature verification')
      
      refresh()
      alert('🎉 Rental agreement signed successfully! Property rented and both parties\' NFTs updated with rental history.')
    } catch (e: any) { 
      console.error('Error renting property:', e)
      alert('Failed to rent property: ' + (e.message || 'Unknown error'))
    } finally { setBusy(false) }
  }

  // Test function to create a mock rental for development
  async function createTestRental() {
    if (!userAddress || listings.length === 0) {
      alert('Please connect wallet and ensure there are properties available')
      return
    }

    // Find a property owned by someone else
    const otherProperty = listings.find(l => 
      l.landlord.toLowerCase() !== userAddress.toLowerCase() &&
      l.active
    )

    if (!otherProperty) {
      alert('No suitable property found for testing')
      return
    }

    try {
      const { addMockTenant } = await import('../lib/mock-tenants')
      const { initializeTrustData } = await import('../lib/trust-data')
      
      // Create mock rental agreement
      const testRental = {
        propertyId: otherProperty.id.toString(),
        tenantAddress: userAddress,
        landlordAddress: otherProperty.landlord,
        monthlyRent: otherProperty.monthlyRent.toString(),
        deposit: otherProperty.deposit.toString(),
        startDate: new Date().toISOString(),
        signature: 'test_signature_' + Date.now()
      }

      // Add mock tenant
      addMockTenant(testRental)

      // Initialize trust data for tenant
      initializeTrustData(userAddress, 'tenant')

      refresh()
      alert('✅ Test rental created! Check landlord dashboard to see tenant management features.')
    } catch (error) {
      console.error('Error creating test rental:', error)
      alert('Failed to create test rental')
    }
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