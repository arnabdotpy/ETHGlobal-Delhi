import { 
  ComprehensiveTrustData, 
  TenantTrustData, 
  LandlordTrustData,
  PaymentRecord,
  TenancyRecord,
  calculateTenantTrustScore,
  calculateLandlordTrustScore
} from './trust-types'

// Local storage keys
const TRUST_DATA_KEY = 'briq_trust_data'
const TRUST_DATA_VERSION = '1.0'

// Get trust data for a user
export function getTrustData(userAddress: string): ComprehensiveTrustData | null {
  try {
    const storageKey = `${TRUST_DATA_KEY}_${userAddress.toLowerCase()}`
    const stored = localStorage.getItem(storageKey)
    if (!stored) return null
    
    const data = JSON.parse(stored)
    if (data.version !== TRUST_DATA_VERSION) {
      // Handle version migration if needed
      return null
    }
    
    return data.trustData
  } catch (error) {
    console.error('Error getting trust data:', error)
    return null
  }
}

// Save trust data for a user
export function saveTrustData(trustData: ComprehensiveTrustData): void {
  try {
    const storageKey = `${TRUST_DATA_KEY}_${trustData.userAddress.toLowerCase()}`
    const dataToStore = {
      version: TRUST_DATA_VERSION,
      trustData: {
        ...trustData,
        updatedAt: Date.now()
      }
    }
    
    localStorage.setItem(storageKey, JSON.stringify(dataToStore))
  } catch (error) {
    console.error('Error saving trust data:', error)
  }
}

// Update existing trust data
export function updateTrustData(userAddress: string, updatedData: ComprehensiveTrustData): void {
  saveTrustData(updatedData)
}

// Initialize trust data for a new user
export function initializeTrustData(
  userAddress: string, 
  userType: 'tenant' | 'landlord' | 'both'
): ComprehensiveTrustData {
  const now = Date.now()
  
  const trustData: ComprehensiveTrustData = {
    userAddress: userAddress.toLowerCase(),
    userType,
    createdAt: now,
    updatedAt: now
  }
  
  if (userType === 'tenant' || userType === 'both') {
    trustData.tenantData = {
      monthlyPaymentRecords: [],
      previousTenancies: [],
      propertyMaintenanceScore: 85, // Start with decent score
      communicationScore: 85,
      leaseComplianceScore: 85,
      noiseComplaints: 0,
      damageReports: 0,
      totalRentPaid: '0',
      onTimePaymentPercentage: 100,
      averageLateDays: 0,
      evictionHistory: 0,
      disputeHistory: 0,
      trustScore: 700, // Start with good score
      lastUpdated: now
    }
  }
  
  if (userType === 'landlord' || userType === 'both') {
    trustData.landlordData = {
      propertiesManaged: [],
      depositReturnHistory: [],
      communicationScore: 85,
      fairnessScore: 85,
      professionalismScore: 85,
      disputeResolutionScore: 85,
      legalComplianceScore: 90,
      unauthorizedEntryReports: 0,
      discriminationComplaints: 0,
      licenseStatus: 'active',
      trustScore: 85, // Start with good score
      lastUpdated: now
    }
  }
  
  saveTrustData(trustData)
  return trustData
}

// Add a payment record for a tenant
export function addPaymentRecord(
  userAddress: string,
  paymentRecord: PaymentRecord
): void {
  const trustData = getTrustData(userAddress)
  if (!trustData || !trustData.tenantData) {
    console.log('No trust data or tenant data found for user:', userAddress)
    return
  }
  
  // Ensure arrays are initialized
  if (!trustData.tenantData.monthlyPaymentRecords) {
    trustData.tenantData.monthlyPaymentRecords = []
  }
  
  // Add the payment record
  trustData.tenantData.monthlyPaymentRecords.push(paymentRecord)
  
  // Update total rent paid safely
  const currentTotal = BigInt(trustData.tenantData.totalRentPaid || '0')
  trustData.tenantData.totalRentPaid = (currentTotal + BigInt(paymentRecord.amount)).toString()
  
  // Recalculate metrics
  updateTenantMetrics(trustData.tenantData)
  
  saveTrustData(trustData)
}

// Add a tenancy record
export function addTenancyRecord(
  userAddress: string,
  tenancyRecord: TenancyRecord
): void {
  const trustData = getTrustData(userAddress)
  if (!trustData || !trustData.tenantData) return
  
  trustData.tenantData.previousTenancies.push(tenancyRecord)
  updateTenantMetrics(trustData.tenantData)
  
  saveTrustData(trustData)
}

// Update tenant behavioral scores
export function updateTenantBehavioralScore(
  userAddress: string,
  scoreType: 'maintenance' | 'communication' | 'compliance',
  newScore: number
): void {
  const trustData = getTrustData(userAddress)
  if (!trustData || !trustData.tenantData) return
  
  switch (scoreType) {
    case 'maintenance':
      trustData.tenantData.propertyMaintenanceScore = newScore
      break
    case 'communication':
      trustData.tenantData.communicationScore = newScore
      break
    case 'compliance':
      trustData.tenantData.leaseComplianceScore = newScore
      break
  }
  
  updateTenantMetrics(trustData.tenantData)
  saveTrustData(trustData)
}

// Update landlord scores
export function updateLandlordScore(
  userAddress: string,
  scoreType: 'communication' | 'fairness' | 'professionalism' | 'dispute',
  newScore: number
): void {
  const trustData = getTrustData(userAddress)
  if (!trustData || !trustData.landlordData) return
  
  switch (scoreType) {
    case 'communication':
      trustData.landlordData.communicationScore = newScore
      break
    case 'fairness':
      trustData.landlordData.fairnessScore = newScore
      break
    case 'professionalism':
      trustData.landlordData.professionalismScore = newScore
      break
    case 'dispute':
      trustData.landlordData.disputeResolutionScore = newScore
      break
  }
  
  updateLandlordMetrics(trustData.landlordData)
  saveTrustData(trustData)
}

// Helper function to update tenant metrics
function updateTenantMetrics(tenantData: TenantTrustData): void {
  const payments = tenantData.monthlyPaymentRecords
  
  if (payments.length > 0) {
    // Calculate on-time payment percentage
    const onTimePayments = payments.filter(p => p.status === 'on-time').length
    tenantData.onTimePaymentPercentage = Math.round((onTimePayments / payments.length) * 100)
    
    // Calculate average late days
    const latePayments = payments.filter(p => p.status === 'late')
    if (latePayments.length > 0) {
      tenantData.averageLateDays = Math.round(
        latePayments.reduce((sum, p) => sum + p.lateDays, 0) / latePayments.length
      )
    } else {
      tenantData.averageLateDays = 0
    }
  }
  
  // Recalculate trust score
  tenantData.trustScore = calculateTenantTrustScore(tenantData)
  tenantData.lastUpdated = Date.now()
}

// Helper function to update landlord metrics
function updateLandlordMetrics(landlordData: LandlordTrustData): void {
  // Recalculate trust score
  landlordData.trustScore = calculateLandlordTrustScore(landlordData)
  landlordData.lastUpdated = Date.now()
}

// Simulate payment for demo purposes
export function simulatePayment(
  userAddress: string,
  propertyId: string,
  amount: string,
  isOnTime: boolean = true
): void {
  const now = Date.now()
  const dueDate = now - (isOnTime ? 24 * 60 * 60 * 1000 : 5 * 24 * 60 * 60 * 1000) // 1 day ago if on time, 5 days ago if late
  
  const paymentRecord: PaymentRecord = {
    amount,
    dueDate,
    paidDate: now,
    status: isOnTime ? 'on-time' : 'late',
    lateDays: isOnTime ? 0 : 4,
    propertyId,
    transactionHash: '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')
  }
  
  addPaymentRecord(userAddress, paymentRecord)
}

// Get trust score summary for display
export function getTrustScoreSummary(userAddress: string) {
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