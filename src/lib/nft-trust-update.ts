import { getTrustData } from './trust-data'
import { getUserNFT } from './hedera'

// Since Hedera NFTs can't be updated after minting, we'll update the local metadata
// and use this for display purposes
export async function updateNFTWithTrustData(userAddress: string): Promise<void> {
  try {
    if (!userAddress) {
      console.log('No user address provided')
      return
    }

    const trustData = getTrustData(userAddress)
    const nftData = await getUserNFT(userAddress)
    
    if (!trustData) {
      console.log('No trust data found for user:', userAddress)
      return
    }
    
    if (!nftData) {
      console.log('No NFT data found for user:', userAddress)
      return
    }
    
    // Create updated metadata with trust scores
    const updatedMetadata = {
      name: nftData.metadata?.name || `User ${userAddress.slice(0, 6)}`,
      description: "Briq user profile with trust scores",
      image: nftData.metadata?.image || `https://api.dicebear.com/7.x/identicon/svg?seed=${userAddress}`,
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
          trait_type: "Address",
          value: `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`
        },
        ...(trustData.tenantData ? [
          {
            trait_type: "Tenant Trust Score",
            value: (trustData.tenantData.trustScore ?? 0).toString()
          },
          {
            trait_type: "On-Time Payment %",
            value: (trustData.tenantData.onTimePaymentPercentage ?? 0).toString()
          },
          {
            trait_type: "Total Payments",
            value: (trustData.tenantData.monthlyPaymentRecords?.length ?? 0).toString()
          },
          {
            trait_type: "Property Care Score",
            value: (trustData.tenantData.propertyMaintenanceScore ?? 0).toString()
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
            trait_type: "Communication Score",
            value: (trustData.landlordData.communicationScore ?? 0).toString()
          },
          {
            trait_type: "Fairness Score",
            value: (trustData.landlordData.fairnessScore ?? 0).toString()
          }
        ] : []),
        {
          trait_type: "Last Updated",
          value: new Date(trustData.updatedAt).toISOString()
        }
      ]
    }
    
    // Update the stored NFT data with new metadata
    const updatedNFTData = {
      ...nftData,
      metadata: updatedMetadata
    }
    
    // Save updated NFT data to localStorage
    const storageKey = `briq_user_nft_${userAddress}`
    localStorage.setItem(storageKey, JSON.stringify(updatedNFTData))
    
    console.log('NFT metadata updated with trust data:', updatedMetadata)
    
  } catch (error) {
    console.error('Error updating NFT with trust data:', error)
    console.error('UserAddress:', userAddress)
    console.error('TrustData:', getTrustData(userAddress))
    
    // Try to get NFT data for debugging
    try {
      const nftData = await getUserNFT(userAddress)
      console.error('NFTData:', nftData)
    } catch (nftError) {
      console.error('Error getting NFT data:', nftError)
    }
  }
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

// Format trust data for NFT display
export function formatTrustDataForNFT(userAddress: string) {
  const trustData = getTrustData(userAddress)
  if (!trustData) return null
  
  return {
    userType: trustData.userType,
    tenantScore: trustData.tenantData?.trustScore || 0,
    landlordScore: trustData.landlordData?.trustScore || 0,
    totalPayments: trustData.tenantData?.monthlyPaymentRecords.length || 0,
    onTimePercentage: trustData.tenantData?.onTimePaymentPercentage || 0,
    propertiesManaged: trustData.landlordData?.propertiesManaged.length || 0,
    lastUpdated: trustData.updatedAt
  }
}