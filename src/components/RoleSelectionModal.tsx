import React, { useState } from 'react'

interface RoleSelectionModalProps {
  isOpen: boolean
  onRoleSelected: (role: 'landlord' | 'tenant') => void
  userAddress: string
}

export default function RoleSelectionModal({ isOpen, onRoleSelected, userAddress }: RoleSelectionModalProps) {
  const [selectedRole, setSelectedRole] = useState<'landlord' | 'tenant' | null>(null)

  if (!isOpen) return null

  const handleConfirm = () => {
    if (selectedRole) {
      onRoleSelected(selectedRole)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
      <div className="bg-neutral-900 rounded-lg border border-neutral-700 p-6 w-full max-w-md">
        <div className="text-center mb-6">
          <div className="text-4xl mb-4">🏠</div>
          <h2 className="text-2xl font-bold mb-2">Welcome to Briq</h2>
          <p className="text-neutral-400 text-sm">
            Choose your role to get started with the platform
          </p>
          <div className="text-xs text-neutral-500 mt-2 font-mono">
            {userAddress.slice(0, 6)}...{userAddress.slice(-4)}
          </div>
        </div>

        <div className="space-y-3 mb-6">
          <button
            onClick={() => setSelectedRole('landlord')}
            className={`w-full p-4 rounded-lg border-2 transition-all ${
              selectedRole === 'landlord'
                ? 'border-neutral-400 bg-neutral-800'
                : 'border-neutral-700 hover:border-neutral-600 bg-neutral-900'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="text-2xl">🏢</div>
              <div className="text-left">
                <div className="font-semibold">Property Owner</div>
                <div className="text-sm text-neutral-400">
                  List properties, manage tenants, track payments
                </div>
              </div>
              <div className="ml-auto">
                <div className={`w-4 h-4 rounded-full border-2 ${
                  selectedRole === 'landlord'
                    ? 'border-white bg-white'
                    : 'border-neutral-500'
                }`} />
              </div>
            </div>
          </button>

          <button
            onClick={() => setSelectedRole('tenant')}
            className={`w-full p-4 rounded-lg border-2 transition-all ${
              selectedRole === 'tenant'
                ? 'border-neutral-400 bg-neutral-800'
                : 'border-neutral-700 hover:border-neutral-600 bg-neutral-900'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="text-2xl">👤</div>
              <div className="text-left">
                <div className="font-semibold">Tenant</div>
                <div className="text-sm text-neutral-400">
                  Find properties, rent, build trust score
                </div>
              </div>
              <div className="ml-auto">
                <div className={`w-4 h-4 rounded-full border-2 ${
                  selectedRole === 'tenant'
                    ? 'border-white bg-white'
                    : 'border-neutral-500'
                }`} />
              </div>
            </div>
          </button>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleConfirm}
            disabled={!selectedRole}
            className="flex-1 px-4 py-2 bg-neutral-700 hover:bg-neutral-600 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors"
          >
            Continue
          </button>
        </div>

        <div className="text-xs text-neutral-500 text-center mt-4">
          You can change your role later in settings
        </div>
      </div>
    </div>
  )
}