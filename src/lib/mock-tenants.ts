// Mock tenant assignment for testing purposes
// This simulates what would happen after a successful signature-based rental

export interface MockTenant {
  propertyId: string
  tenantAddress: string
  landlordAddress: string
  monthlyRent: string
  deposit: string
  startDate: string
  signature: string
}

const MOCK_TENANTS_KEY = 'briq_mock_tenants'

export function getMockTenants(): MockTenant[] {
  try {
    const stored = localStorage.getItem(MOCK_TENANTS_KEY)
    return stored ? JSON.parse(stored) : []
  } catch (error) {
    console.error('Error getting mock tenants:', error)
    return []
  }
}

export function addMockTenant(tenant: MockTenant): void {
  try {
    const tenants = getMockTenants()
    // Remove any existing tenant for this property
    const filtered = tenants.filter(t => t.propertyId !== tenant.propertyId)
    filtered.push(tenant)
    localStorage.setItem(MOCK_TENANTS_KEY, JSON.stringify(filtered))
    console.log('✅ Mock tenant added:', tenant)
  } catch (error) {
    console.error('Error adding mock tenant:', error)
  }
}

export function removeMockTenant(propertyId: string): void {
  try {
    const tenants = getMockTenants()
    const filtered = tenants.filter(t => t.propertyId !== propertyId)
    localStorage.setItem(MOCK_TENANTS_KEY, JSON.stringify(filtered))
    console.log('✅ Mock tenant removed for property:', propertyId)
  } catch (error) {
    console.error('Error removing mock tenant:', error)
  }
}

export function getTenantForProperty(propertyId: string): MockTenant | null {
  const tenants = getMockTenants()
  return tenants.find(t => t.propertyId === propertyId) || null
}

export function getPropertiesForLandlord(landlordAddress: string): MockTenant[] {
  const tenants = getMockTenants()
  return tenants.filter(t => t.landlordAddress.toLowerCase() === landlordAddress.toLowerCase())
}