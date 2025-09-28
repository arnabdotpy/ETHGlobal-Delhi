import { updateNFTWithTrustData } from './nft-trust-update'

export interface RentalAgreement {
  propertyId: string
  landlord: string
  tenant: string
  monthlyRent: string
  deposit: string
  startDate: string
  agreementHash: string
}

export async function updateRentalNFTMetadata(agreement: RentalAgreement, signature: string) {
  console.log('📝 Updating NFT metadata for rental agreement...')
  
  try {
    // Update landlord's NFT with new rental data
    console.log('Updating landlord NFT metadata...')
    await updateNFTWithTrustData(agreement.landlord)
    
    // Update tenant's NFT with rental information
    console.log('Updating tenant NFT metadata...')
    await updateNFTWithTrustData(agreement.tenant)
    
    console.log('✅ Both NFTs updated successfully with rental information')
  } catch (error) {
    console.error('❌ Failed to update NFT metadata:', error)
    // Don't throw error - we don't want rental to fail just because NFT update failed
    console.warn('Continuing with rental despite NFT update failure')
  }
}

export async function recordRentalHistory(agreement: RentalAgreement, signature: string) {
  console.log('📋 Recording rental history in trust system...')
  
  try {
    const { getTrustData, initializeTrustData, updateTrustData } = await import('./trust-data')
    
    // Update landlord's trust data with new tenant
    let landlordTrust = getTrustData(agreement.landlord)
    if (!landlordTrust) {
      landlordTrust = initializeTrustData(agreement.landlord, 'landlord')
    }
    
    // Add to landlord's rental history
    const landlordUpdate = {
      ...landlordTrust,
      rentalHistory: [
        ...(landlordTrust.rentalHistory || []),
        {
          tenantAddress: agreement.tenant,
          propertyId: agreement.propertyId,
          startDate: agreement.startDate,
          monthlyRent: agreement.monthlyRent,
          deposit: agreement.deposit,
          status: 'active' as const,
          signature: signature,
          agreementHash: agreement.agreementHash
        }
      ]
    }
    
    updateTrustData(agreement.landlord, landlordUpdate)
    
    // Update tenant's trust data with rental information
    let tenantTrust = getTrustData(agreement.tenant)
    if (!tenantTrust) {
      tenantTrust = initializeTrustData(agreement.tenant, 'tenant')
    }
    
    // Add to tenant's rental history
    const tenantUpdate = {
      ...tenantTrust,
      currentRental: {
        landlordAddress: agreement.landlord,
        propertyId: agreement.propertyId,
        startDate: agreement.startDate,
        monthlyRent: agreement.monthlyRent,
        deposit: agreement.deposit,
        signature: signature,
        agreementHash: agreement.agreementHash
      },
      rentalHistory: [
        ...(tenantTrust.rentalHistory || []),
        {
          landlordAddress: agreement.landlord,
          propertyId: agreement.propertyId,
          startDate: agreement.startDate,  
          monthlyRent: agreement.monthlyRent,
          deposit: agreement.deposit,
          status: 'active' as const,
          signature: signature,
          agreementHash: agreement.agreementHash
        }
      ]
    }
    
    updateTrustData(agreement.tenant, tenantUpdate)
    
    console.log('✅ Rental history recorded for both parties')
  } catch (error) {
    console.error('❌ Failed to record rental history:', error)
    // Don't throw here - we don't want to fail the rental if trust recording fails
    console.warn('Continuing with rental despite trust recording failure')
  }
}