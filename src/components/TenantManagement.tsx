import React, { useState, useEffect } from 'react'
import { getTrustData, updateTrustData } from '../lib/trust-data'
import { ComprehensiveTrustData } from '../lib/trust-types'
import { getPropertiesForLandlord, MockTenant } from '../lib/mock-tenants'

interface TenantManagementProps {
  userAddress: string
  listings: any[]
  onRefresh: () => void
}

interface TenantInfo {
  address: string
  propertyId: string
  trustData: ComprehensiveTrustData | null
  propertyName: string
  monthlyRent: string
  depositAmount: string
  startDate?: string
}

interface PaymentAction {
  type: 'on-time' | 'late' | 'missed'
  amount: string
  dueDate: string
  notes?: string
}

interface BehavioralAction {
  type: 'noise_complaint' | 'property_damage' | 'maintenance_issue' | 'lease_violation'
  severity: 'minor' | 'moderate' | 'severe'
  description: string
}

interface QueryAction {
  type: 'maintenance_request' | 'lease_inquiry' | 'complaint' | 'compliment'
  subject: string
  description: string
  priority: 'low' | 'medium' | 'high'
}

export default function TenantManagement({ userAddress, listings, onRefresh }: TenantManagementProps) {
  const [tenants, setTenants] = useState<TenantInfo[]>([])
  const [selectedTenant, setSelectedTenant] = useState<TenantInfo | null>(null)
  const [activeModal, setActiveModal] = useState<'payment' | 'behavioral' | 'query' | null>(null)
  const [paymentAction, setPaymentAction] = useState<PaymentAction>({
    type: 'on-time',
    amount: '',
    dueDate: new Date().toISOString().split('T')[0],
    notes: ''
  })
  const [behavioralAction, setBehavioralAction] = useState<BehavioralAction>({
    type: 'maintenance_issue',
    severity: 'minor',
    description: ''
  })
  const [queryAction, setQueryAction] = useState<QueryAction>({
    type: 'maintenance_request',
    subject: '',
    description: '',
    priority: 'medium'
  })

  const weiToHbar = (wei: bigint | string): string => {
    const weiValue = typeof wei === 'string' ? BigInt(wei) : wei
    const hbar = Number(weiValue) / 1e18
    return hbar.toFixed(4)
  }

  const parseMetadata = (metadataURI: string) => {
    try {
      if (metadataURI.startsWith('data:application/json;base64,')) {
        const base64Data = metadataURI.split(',')[1]
        return JSON.parse(atob(base64Data))
      }
      return null
    } catch {
      return null
    }
  }

  useEffect(() => {
    console.log('🏠 TenantManagement: Processing listings for user:', userAddress)
    console.log('🏠 Total listings:', listings.length)
    
    const userProperties = listings.filter(l => 
      l.landlord.toLowerCase() === userAddress.toLowerCase()
    )
    console.log('🏠 User properties found:', userProperties.length)

    // Get tenants from smart contract (traditional rentals)
    const propertiesWithTenants = userProperties.filter(property => 
      property.tenant !== '0x0000000000000000000000000000000000000000'
    )
    console.log('🏠 Properties with smart contract tenants:', propertiesWithTenants.length)

    // Get tenants from signature-based rentals
    const mockTenants = getPropertiesForLandlord(userAddress)
    console.log('🏠 Properties with signature-based tenants:', mockTenants.length)

    const tenantList: TenantInfo[] = []

    // Add smart contract tenants
    propertiesWithTenants.forEach(property => {
      const metadata = parseMetadata(property.metadataURI)
      tenantList.push({
        address: property.tenant,
        propertyId: property.id.toString(),
        trustData: getTrustData(property.tenant),
        propertyName: metadata?.name || `Property #${property.id}`,
        monthlyRent: property.monthlyRent.toString(),
        depositAmount: property.deposit.toString()
      })
      console.log(`🏠 Added smart contract tenant for property ${property.id}: ${property.tenant}`)
    })

    // Add signature-based tenants
    mockTenants.forEach(mockTenant => {
      // Find the corresponding property in listings
      const property = userProperties.find(p => p.id.toString() === mockTenant.propertyId)
      if (property) {
        const metadata = parseMetadata(property.metadataURI)
        tenantList.push({
          address: mockTenant.tenantAddress,
          propertyId: mockTenant.propertyId,
          trustData: getTrustData(mockTenant.tenantAddress),
          propertyName: metadata?.name || `Property #${mockTenant.propertyId}`,
          monthlyRent: mockTenant.monthlyRent,
          depositAmount: mockTenant.deposit,
          startDate: mockTenant.startDate
        })
        console.log(`🏠 Added signature-based tenant for property ${mockTenant.propertyId}: ${mockTenant.tenantAddress}`)
      }
    })

    console.log('🏠 Final tenant list:', tenantList)
    setTenants(tenantList)
  }, [listings, userAddress])

  const handlePaymentAction = async () => {
    if (!selectedTenant) return

    try {
      const trustData = selectedTenant.trustData
      if (!trustData || !trustData.tenantData) return

      const now = Date.now()
      const dueDate = new Date(paymentAction.dueDate).getTime()
      const lateDays = paymentAction.type === 'late' ? 
        Math.max(0, Math.floor((now - dueDate) / (1000 * 60 * 60 * 24))) : 0

      // Create payment record
      const paymentRecord = {
        amount: paymentAction.amount,
        dueDate,
        paidDate: paymentAction.type === 'missed' ? 0 : now,
        status: paymentAction.type as 'on-time' | 'late' | 'missed',
        lateDays,
        propertyId: selectedTenant.propertyId,
        notes: paymentAction.notes
      }

      // Update tenant's payment history
      const updatedTenantData = {
        ...trustData.tenantData,
        monthlyPaymentRecords: [...trustData.tenantData.monthlyPaymentRecords, paymentRecord]
      }

      // Recalculate scores based on payment behavior
      if (paymentAction.type === 'on-time') {
        updatedTenantData.communicationScore = Math.min(100, updatedTenantData.communicationScore + 2)
      } else if (paymentAction.type === 'late') {
        updatedTenantData.leaseComplianceScore = Math.max(0, updatedTenantData.leaseComplianceScore - 5)
      } else if (paymentAction.type === 'missed') {
        updatedTenantData.leaseComplianceScore = Math.max(0, updatedTenantData.leaseComplianceScore - 15)
        updatedTenantData.communicationScore = Math.max(0, updatedTenantData.communicationScore - 10)
      }

      // Update trust data
      const updatedTrustData = {
        ...trustData,
        tenantData: updatedTenantData,
        updatedAt: now
      }

      updateTrustData(selectedTenant.address, updatedTrustData)

      // Refresh tenant list
      setTenants(prev => prev.map(t => 
        t.address === selectedTenant.address 
          ? { ...t, trustData: getTrustData(t.address) }
          : t
      ))

      setActiveModal(null)
      setPaymentAction({ type: 'on-time', amount: '', dueDate: new Date().toISOString().split('T')[0], notes: '' })
      
    } catch (error) {
      console.error('Error recording payment action:', error)
    }
  }

  const handleBehavioralAction = async () => {
    if (!selectedTenant) return

    try {
      const trustData = selectedTenant.trustData
      if (!trustData || !trustData.tenantData) return

      const severityImpact = {
        minor: 5,
        moderate: 10,
        severe: 20
      }

      const impact = severityImpact[behavioralAction.severity]
      const updatedTenantData = { ...trustData.tenantData }

      // Apply behavioral impacts
      switch (behavioralAction.type) {
        case 'noise_complaint':
          updatedTenantData.leaseComplianceScore = Math.max(0, updatedTenantData.leaseComplianceScore - impact)
          updatedTenantData.noiseComplaints = updatedTenantData.noiseComplaints + 1
          break
        case 'property_damage':
          updatedTenantData.propertyMaintenanceScore = Math.max(0, updatedTenantData.propertyMaintenanceScore - impact)
          updatedTenantData.damageReports = updatedTenantData.damageReports + 1
          break
        case 'maintenance_issue':
          updatedTenantData.propertyMaintenanceScore = Math.max(0, updatedTenantData.propertyMaintenanceScore - Math.floor(impact / 2))
          break
        case 'lease_violation':
          updatedTenantData.leaseComplianceScore = Math.max(0, updatedTenantData.leaseComplianceScore - impact)
          break
      }

      const updatedTrustData = {
        ...trustData,
        tenantData: updatedTenantData,
        updatedAt: Date.now()
      }

      updateTrustData(selectedTenant.address, updatedTrustData)

      setTenants(prev => prev.map(t => 
        t.address === selectedTenant.address 
          ? { ...t, trustData: getTrustData(t.address) }
          : t
      ))

      setActiveModal(null)
      setBehavioralAction({ type: 'maintenance_issue', severity: 'minor', description: '' })
      
    } catch (error) {
      console.error('Error recording behavioral action:', error)
    }
  }

  const handleQueryAction = async () => {
    // For now, just log the query - in a real app this would create a ticket system
    console.log('Query created:', {
      tenant: selectedTenant?.address,
      property: selectedTenant?.propertyId,
      ...queryAction,
      timestamp: new Date().toISOString()
    })

    // You could integrate with a ticketing system or communication platform here
    alert(`Query "${queryAction.subject}" has been logged for tenant ${selectedTenant?.address.slice(0, 8)}...`)

    setActiveModal(null)
    setQueryAction({ type: 'maintenance_request', subject: '', description: '', priority: 'medium' })
  }

  const getTrustScoreColor = (score: number, maxScore: number = 100) => {
    const percentage = (score / maxScore) * 100
    if (percentage >= 80) return 'text-green-400'
    if (percentage >= 60) return 'text-yellow-400'
    return 'text-red-400'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Tenant Management</h2>
        <div className="text-sm text-neutral-400">
          {tenants.length} Active Tenant{tenants.length !== 1 ? 's' : ''}
        </div>
      </div>

      {tenants.length === 0 ? (
        <div className="text-center py-12 text-neutral-400">
          <div className="text-4xl mb-4">👥</div>
          <p>No active tenants</p>
          <p className="text-sm mt-2">Your rented properties will show tenant management options here</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tenants.map(tenant => (
            <div 
              key={tenant.address}
              className="bg-neutral-900 rounded-lg border border-neutral-800 p-5 hover:border-neutral-700 transition-colors"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-1">{tenant.propertyName}</h3>
                  <div className="text-sm text-neutral-400 mb-2">
                    Tenant: {tenant.address.slice(0, 8)}...{tenant.address.slice(-6)}
                  </div>
                  <div className="text-sm text-neutral-300">
                    Monthly Rent: {weiToHbar(tenant.monthlyRent)} HBAR
                  </div>
                </div>
              </div>

              {/* Trust Scores */}
              {tenant.trustData?.tenantData && (
                <div className="mb-4 p-3 bg-neutral-800/50 rounded-lg">
                  <div className="text-xs text-neutral-400 mb-2">Trust Scores</div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex justify-between">
                      <span>Payment:</span>
                      <span className={getTrustScoreColor(tenant.trustData.tenantData.onTimePaymentPercentage)}>
                        {tenant.trustData.tenantData.onTimePaymentPercentage}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Maintenance:</span>
                      <span className={getTrustScoreColor(tenant.trustData.tenantData.propertyMaintenanceScore)}>
                        {tenant.trustData.tenantData.propertyMaintenanceScore}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Communication:</span>
                      <span className={getTrustScoreColor(tenant.trustData.tenantData.communicationScore)}>
                        {tenant.trustData.tenantData.communicationScore}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Compliance:</span>
                      <span className={getTrustScoreColor(tenant.trustData.tenantData.leaseComplianceScore)}>
                        {tenant.trustData.tenantData.leaseComplianceScore}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-2">
                <button
                  onClick={() => {
                    setSelectedTenant(tenant)
                    setPaymentAction(prev => ({ ...prev, amount: weiToHbar(tenant.monthlyRent) }))
                    setActiveModal('payment')
                  }}
                  className="w-full px-3 py-2 bg-blue-700 hover:bg-blue-600 text-white rounded text-sm font-medium transition-colors"
                >
                  Record Payment
                </button>
                
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      setSelectedTenant(tenant)
                      setActiveModal('behavioral')
                    }}
                    className="px-3 py-2 bg-yellow-700 hover:bg-yellow-600 text-white rounded text-sm font-medium transition-colors"
                  >
                    Behavioral Action
                  </button>
                  
                  <button
                    onClick={() => {
                      setSelectedTenant(tenant)
                      setActiveModal('query')
                    }}
                    className="px-3 py-2 bg-green-700 hover:bg-green-600 text-white rounded text-sm font-medium transition-colors"
                  >
                    Raise Query
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Payment Modal */}
      {activeModal === 'payment' && selectedTenant && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Record Payment - {selectedTenant.propertyName}</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Payment Status</label>
                <select
                  value={paymentAction.type}
                  onChange={(e) => setPaymentAction(prev => ({ ...prev, type: e.target.value as any }))}
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded focus:ring-2 focus:ring-blue-500"
                >
                  <option value="on-time">On-Time Payment</option>
                  <option value="late">Late Payment</option>
                  <option value="missed">Missed Payment</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Amount (HBAR)</label>
                <input
                  type="number"
                  step="0.0001"
                  value={paymentAction.amount}
                  onChange={(e) => setPaymentAction(prev => ({ ...prev, amount: e.target.value }))}
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Due Date</label>
                <input
                  type="date"
                  value={paymentAction.dueDate}
                  onChange={(e) => setPaymentAction(prev => ({ ...prev, dueDate: e.target.value }))}
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Notes (Optional)</label>
                <textarea
                  value={paymentAction.notes}
                  onChange={(e) => setPaymentAction(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded focus:ring-2 focus:ring-blue-500 h-20"
                  placeholder="Additional notes about this payment..."
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setActiveModal(null)}
                className="flex-1 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handlePaymentAction}
                className="flex-1 px-4 py-2 bg-blue-700 hover:bg-blue-600 text-white rounded font-medium transition-colors"
              >
                Record Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Behavioral Modal */}
      {activeModal === 'behavioral' && selectedTenant && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Behavioral Action - {selectedTenant.propertyName}</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Issue Type</label>
                <select
                  value={behavioralAction.type}
                  onChange={(e) => setBehavioralAction(prev => ({ ...prev, type: e.target.value as any }))}
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded focus:ring-2 focus:ring-yellow-500"
                >
                  <option value="maintenance_issue">Maintenance Issue</option>
                  <option value="noise_complaint">Noise Complaint</option>
                  <option value="property_damage">Property Damage</option>
                  <option value="lease_violation">Lease Violation</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Severity</label>
                <select
                  value={behavioralAction.severity}
                  onChange={(e) => setBehavioralAction(prev => ({ ...prev, severity: e.target.value as any }))}
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded focus:ring-2 focus:ring-yellow-500"
                >
                  <option value="minor">Minor</option>
                  <option value="moderate">Moderate</option>
                  <option value="severe">Severe</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <textarea
                  value={behavioralAction.description}
                  onChange={(e) => setBehavioralAction(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded focus:ring-2 focus:ring-yellow-500 h-24"
                  placeholder="Describe the issue in detail..."
                  required
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setActiveModal(null)}
                className="flex-1 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleBehavioralAction}
                disabled={!behavioralAction.description}
                className="flex-1 px-4 py-2 bg-yellow-700 hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded font-medium transition-colors"
              >
                Record Action
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Query Modal */}
      {activeModal === 'query' && selectedTenant && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Raise Query - {selectedTenant.propertyName}</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Query Type</label>
                <select
                  value={queryAction.type}
                  onChange={(e) => setQueryAction(prev => ({ ...prev, type: e.target.value as any }))}
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded focus:ring-2 focus:ring-green-500"
                >
                  <option value="maintenance_request">Maintenance Request</option>
                  <option value="lease_inquiry">Lease Inquiry</option>
                  <option value="complaint">Complaint</option>
                  <option value="compliment">Compliment</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Priority</label>
                <select
                  value={queryAction.priority}
                  onChange={(e) => setQueryAction(prev => ({ ...prev, priority: e.target.value as any }))}
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded focus:ring-2 focus:ring-green-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Subject</label>
                <input
                  type="text"
                  value={queryAction.subject}
                  onChange={(e) => setQueryAction(prev => ({ ...prev, subject: e.target.value }))}
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded focus:ring-2 focus:ring-green-500"
                  placeholder="Brief subject line..."
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <textarea
                  value={queryAction.description}
                  onChange={(e) => setQueryAction(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded focus:ring-2 focus:ring-green-500 h-24"
                  placeholder="Detailed description of your query..."
                  required
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setActiveModal(null)}
                className="flex-1 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleQueryAction}
                disabled={!queryAction.subject || !queryAction.description}
                className="flex-1 px-4 py-2 bg-green-700 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded font-medium transition-colors"
              >
                Send Query
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}