// Trust Record System Types
export interface PaymentRecord {
  amount: string // in wei
  dueDate: number // timestamp
  paidDate: number // timestamp
  status: 'on-time' | 'late' | 'missed'
  lateDays: number
  propertyId: string
  transactionHash?: string
}

export interface TenancyRecord {
  propertyId: string
  landlordAddress: string
  startDate: number // timestamp
  endDate: number // timestamp
  monthlyRent: string // in wei
  deposit: string // in wei
  earlyTermination: boolean
  reasonForLeaving: 'lease-expired' | 'evicted' | 'voluntary' | 'breach'
  landlordRating?: number // 1-5 stars
  tenantRating?: number // 1-5 stars (given by landlord)
}

export interface TenantTrustData {
  // Financial History
  monthlyPaymentRecords: PaymentRecord[]
  previousTenancies: TenancyRecord[]
  
  // Behavioral Metrics
  propertyMaintenanceScore: number // 0-100
  communicationScore: number // 0-100
  leaseComplianceScore: number // 0-100
  noiseComplaints: number
  damageReports: number
  
  // Financial Reliability
  totalRentPaid: string // in wei
  onTimePaymentPercentage: number // 0-100
  averageLateDays: number
  evictionHistory: number
  disputeHistory: number
  
  // Calculated Trust Score (0-850, like CIBIL)
  trustScore: number
  lastUpdated: number // timestamp
}

export interface PropertyManagementRecord {
  propertyId: string
  maintenanceResponseTime: number // average hours
  maintenanceCompletionTime: number // average hours
  propertyConditionScore: number // 0-100
}

export interface DepositReturnRecord {
  tenantAddress: string
  propertyId: string
  depositAmount: string // in wei
  returnedAmount: string // in wei
  deductionReasons: string[]
  returnTimeInDays: number
  tenantSatisfactionRating?: number // 1-5 stars
}

export interface LandlordTrustData {
  // Property Management
  propertiesManaged: PropertyManagementRecord[]
  
  // Financial Transparency
  depositReturnHistory: DepositReturnRecord[]
  
  // Tenant Relations
  communicationScore: number // 0-100
  fairnessScore: number // 0-100
  professionalismScore: number // 0-100
  disputeResolutionScore: number // 0-100
  
  // Legal Compliance
  legalComplianceScore: number // 0-100
  unauthorizedEntryReports: number
  discriminationComplaints: number
  licenseStatus: 'active' | 'expired' | 'suspended'
  
  // Calculated Trust Score (0-100)
  trustScore: number
  lastUpdated: number // timestamp
}

export interface ComprehensiveTrustData {
  userAddress: string
  userType: 'tenant' | 'landlord' | 'both'
  tenantData?: TenantTrustData
  landlordData?: LandlordTrustData
  createdAt: number // timestamp
  updatedAt: number // timestamp
}

// Helper functions for trust score calculations
export function calculateTenantTrustScore(data: TenantTrustData): number {
  const paymentHistoryScore = data.onTimePaymentPercentage * 0.35
  const tenancyStabilityScore = Math.min(100, (data.previousTenancies.length * 20)) * 0.30
  const propertyCareScore = data.propertyMaintenanceScore * 0.20
  const financialCapacityScore = Math.max(0, 100 - (data.averageLateDays * 2)) * 0.10
  const disputeScore = Math.max(0, 100 - (data.disputeHistory * 10)) * 0.05
  
  return Math.round(
    (paymentHistoryScore + tenancyStabilityScore + propertyCareScore + 
     financialCapacityScore + disputeScore) * 8.5 // Scale to 850
  )
}

export function calculateLandlordTrustScore(data: LandlordTrustData): number {
  const depositFairnessScore = data.fairnessScore * 0.25
  const maintenanceScore = (100 - Math.min(100, data.propertiesManaged.reduce((acc, p) => 
    acc + p.maintenanceResponseTime, 0) / data.propertiesManaged.length)) * 0.25
  const communicationScore = data.communicationScore * 0.20
  const legalComplianceScore = data.legalComplianceScore * 0.20
  const tenantSatisfactionScore = data.professionalismScore * 0.10
  
  return Math.round(
    depositFairnessScore + maintenanceScore + communicationScore + 
    legalComplianceScore + tenantSatisfactionScore
  )
}