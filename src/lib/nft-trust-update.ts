import { getTrustData } from './trust-data'
import { getUserNFT, mintUserNFT, getClient, MY_PRIVATE_KEY } from './hedera'
import { TokenBurnTransaction, Hbar } from '@hashgraph/sdk'

// Since Hedera NFTs are immutable, we'll mint a new NFT with updated trust data
// and burn the old one to maintain a single active NFT per user
export async function updateNFTWithTrustData(userAddress: string): Promise<void> {
  try {
    if (!userAddress) {
      console.log('No user address provided')
      return
    }

    const trustData = getTrustData(userAddress)
    
    if (!trustData) {
      console.log('No trust data found for user:', userAddress)
      return
    }

    // Get current NFT data
    const currentNFT = await getUserNFT(userAddress)
    console.log('Updating NFT with fresh trust data for user:', userAddress)
    
    // Create comprehensive on-chain metadata with trust scores
    const trustMetadata = createTrustMetadata(trustData, userAddress)
    
    // Get the NFT token ID from storage or create new collection
    let nftTokenId = localStorage.getItem('briq_nft_token_id')
    if (!nftTokenId) {
      console.log('No NFT collection found, user needs to create NFT first')
      return
    }

    // If user has an existing NFT, burn it first (optional - only if burn key is set)
    if (currentNFT) {
      try {
        await burnExistingNFT(nftTokenId, currentNFT.serialNumber)
        console.log('Burned old NFT:', currentNFT.serialNumber)
      } catch (error) {
        console.log('Could not burn old NFT (no burn key set), keeping both versions')
      }
    }

    // Mint new NFT with updated trust data
    const newNFT = await mintNFTWithTrustData(nftTokenId, userAddress, trustMetadata)
    
    // Update the stored reference to point to new NFT
    const updatedNFTData = {
      tokenId: newNFT.tokenId,
      serialNumber: newNFT.serialNumber,
      metadata: trustMetadata,
      transactionId: newNFT.transactionId,
      hashscanUrl: newNFT.hashscanUrl,
      updatedAt: Date.now()
    }

    // Store reference to new NFT
    const storageKey = `briq_user_nft_${userAddress}`
    localStorage.setItem(storageKey, JSON.stringify(updatedNFTData))
    
    console.log('Successfully updated NFT on-chain with new trust data')
    console.log('New NFT Serial:', newNFT.serialNumber)
    console.log('Transaction ID:', newNFT.transactionId)
    
  } catch (error) {
    console.error('Error updating NFT with trust data:', error)
    throw error
  }
}

// Create comprehensive trust metadata for NFT
function createTrustMetadata(trustData: any, userAddress: string) {
  const metadata = {
    name: `Briq User ${userAddress.slice(0, 6)} Trust Profile`,
    description: `Verified trust profile for Briq platform user with real-time trust scores`,
    image: `https://api.dicebear.com/7.x/identicon/svg?seed=${userAddress}`,
    external_url: `https://briq.app/profile/${userAddress}`,
    attributes: [
      {
        trait_type: "Platform",
        value: "Briq"
      },
      {
        trait_type: "User Type",
        value: trustData.userType
      },
      {
        trait_type: "Wallet Address",
        value: userAddress
      },
      ...(trustData.tenantData ? [
        {
          trait_type: "Tenant Trust Score",
          value: (trustData.tenantData.trustScore ?? 0).toString()
        },
        {
          trait_type: "On-Time Payment Rate",
          value: `${(trustData.tenantData.onTimePaymentPercentage ?? 0).toFixed(1)}%`
        },
        {
          trait_type: "Total Payments Made",
          value: (trustData.tenantData.monthlyPaymentRecords?.length ?? 0).toString()
        },
        {
          trait_type: "Property Care Score",
          value: (trustData.tenantData.propertyMaintenanceScore ?? 0).toString()
        },
        {
          trait_type: "Lease Violations",
          value: (trustData.tenantData.leaseViolations?.length ?? 0).toString()
        }
      ] : []),
      ...(trustData.landlordData ? [
        {
          trait_type: "Landlord Trust Score",
          value: (trustData.landlordData.trustScore ?? 0).toString()
        },
        {
          trait_type: "Properties Managed",
          value: (trustData.landlordData.propertiesManaged?.length ?? 0).toString()
        },
        {
          trait_type: "Tenant Communication Score",
          value: (trustData.landlordData.communicationScore ?? 0).toString()
        },
        {
          trait_type: "Fairness Score",
          value: (trustData.landlordData.fairnessScore ?? 0).toString()
        },
        {
          trait_type: "Property Quality Score",
          value: (trustData.landlordData.propertyQualityScore ?? 0).toString()
        }
      ] : []),
      {
        trait_type: "Profile Created",
        value: new Date(trustData.createdAt).toISOString().split('T')[0]
      },
      {
        trait_type: "Last Updated",
        value: new Date(trustData.updatedAt).toISOString().split('T')[0]
      },
      {
        trait_type: "Trust Profile Version",
        value: "2.0"
      }
    ]
  }
  
  return metadata
}

// Mint a new NFT with trust data
async function mintNFTWithTrustData(tokenId: string, userAddress: string, metadata: any) {
  // Convert metadata to minimal string for on-chain storage
  const compactMetadata = {
    type: metadata.attributes.find((a: any) => a.trait_type === "User Type")?.value || "user",
    score: metadata.attributes.find((a: any) => a.trait_type.includes("Trust Score"))?.value || "0",
    updated: new Date().toISOString().split('T')[0]
  }
  
  const metadataString = JSON.stringify(compactMetadata)
  console.log('Minting NFT with compact metadata:', metadataString)
  
  return await mintUserNFT(tokenId, userAddress, metadataString)
}

// Burn existing NFT (if burn key is available)
async function burnExistingNFT(tokenId: string, serialNumber: string) {
  const client = getClient()
  
  const burnTx = new TokenBurnTransaction()
    .setTokenId(tokenId)
    .setSerials([parseInt(serialNumber)])
    .setMaxTransactionFee(new Hbar(5))
    
  const frozenTx = await burnTx.freezeWith(client)
  const signedTx = await frozenTx.sign(MY_PRIVATE_KEY)
  const response = await signedTx.execute(client)
  
  return await response.getReceipt(client)
}

// Get trust score color for UI display
export function getTrustScoreColor(score: number, maxScore: number = 100): string {
  const percentage = (score / maxScore) * 100
  if (percentage >= 80) return 'text-green-400'
  if (percentage >= 60) return 'text-yellow-400'
  if (percentage >= 40) return 'text-orange-400'
  return 'text-red-400'
}

// Get trust score label
export function getTrustScoreLabel(score: number, maxScore: number = 100): string {
  const percentage = (score / maxScore) * 100
  if (percentage >= 90) return 'Excellent'
  if (percentage >= 75) return 'Very Good'
  if (percentage >= 60) return 'Good'
  if (percentage >= 40) return 'Fair'
  return 'Poor'
}

// Check if NFT needs updating based on trust data changes
export async function doesNFTNeedUpdate(userAddress: string): Promise<boolean> {
  try {
    const trustData = getTrustData(userAddress)
    const nftData = await getUserNFT(userAddress)
    
    if (!trustData || !nftData) return false
    
    // Check if trust data was updated after the NFT
    const nftUpdatedAt = nftData.metadata?.attributes?.find(
      (attr: any) => attr.trait_type === 'Last Updated'
    )?.value
    
    if (!nftUpdatedAt) return true // NFT has no update timestamp, needs update
    
    const nftDate = new Date(nftUpdatedAt).getTime()
    const trustDate = trustData.updatedAt
    
    return trustDate > nftDate
  } catch (error) {
    console.error('Error checking if NFT needs update:', error)
    return false
  }
}

// Format trust data for NFT display
export function formatTrustDataForNFT(userAddress: string) {
  const trustData = getTrustData(userAddress)
  if (!trustData) return null
  
  return {
    userType: trustData.userType,
    tenantScore: trustData.tenantData?.trustScore || 0,
    landlordScore: trustData.landlordData?.trustScore || 0,
    totalPayments: trustData.tenantData?.monthlyPaymentRecords?.length || 0,
    onTimePercentage: trustData.tenantData?.onTimePaymentPercentage || 0,
    propertiesManaged: trustData.landlordData?.propertiesManaged?.length || 0,
    lastUpdated: trustData.updatedAt,
    hasComprehensiveData: !!(trustData.tenantData || trustData.landlordData)
  }
}

// Get a summary of what changed in trust data for logging
export function getTrustDataSummary(userAddress: string): string {
  const formatted = formatTrustDataForNFT(userAddress)
  if (!formatted) return 'No trust data'
  
  return `${formatted.userType} | Tenant: ${formatted.tenantScore} | Landlord: ${formatted.landlordScore} | Payments: ${formatted.totalPayments} | Updated: ${new Date(formatted.lastUpdated).toLocaleDateString()}`
}