// User role management
const USER_ROLE_KEY = 'briq_user_role'

export type UserRole = 'landlord' | 'tenant'

export function saveUserRole(userAddress: string, role: UserRole): void {
  const storageKey = `${USER_ROLE_KEY}_${userAddress.toLowerCase()}`
  localStorage.setItem(storageKey, role)
}

export function getUserRole(userAddress: string): UserRole | null {
  const storageKey = `${USER_ROLE_KEY}_${userAddress.toLowerCase()}`
  return localStorage.getItem(storageKey) as UserRole | null
}

export function clearUserRole(userAddress: string): void {
  const storageKey = `${USER_ROLE_KEY}_${userAddress.toLowerCase()}`
  localStorage.removeItem(storageKey)
}

export function hasUserRole(userAddress: string): boolean {
  return getUserRole(userAddress) !== null
}