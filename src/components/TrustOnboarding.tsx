import React, { useState } from 'react'
import { initializeTrustData } from '../lib/trust-data'

interface TrustOnboardingProps {
  userAddress: string
  onComplete: () => void
}

export default function TrustOnboarding({ userAddress, onComplete }: TrustOnboardingProps) {
  const [selectedType, setSelectedType] = useState<'tenant' | 'landlord' | 'both' | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  const handleCreateProfile = async () => {
    if (!selectedType) return

    setIsCreating(true)
    try {
      initializeTrustData(userAddress, selectedType)
      onComplete()
    } catch (error) {
      console.error('Error creating trust profile:', error)
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-8 text-white text-center">
          <div className="text-4xl mb-4">🏠⭐</div>
          <h1 className="text-3xl font-bold mb-2">Welcome to Briq Trust</h1>
          <p className="text-blue-100">Build your rental reputation and unlock better opportunities</p>
        </div>

        {/* Content */}
        <div className="p-8">
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">How will you be using Briq?</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Choose your role to get started with building your trust profile. You can always change this later.
            </p>

            <div className="grid gap-4">
              {/* Tenant Option */}
              <div
                onClick={() => setSelectedType('tenant')}
                className={`p-6 rounded-xl border-2 cursor-pointer transition-all ${
                  selectedType === 'tenant'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10'
                    : 'border-gray-200 dark:border-neutral-700 hover:border-blue-300 dark:hover:border-blue-600'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white text-xl">
                    👤
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">I'm a Tenant</h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                      Looking to rent properties and build payment history
                    </p>
                  </div>
                  {selectedType === 'tenant' && (
                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white">
                      ✓
                    </div>
                  )}
                </div>
              </div>

              {/* Landlord Option */}
              <div
                onClick={() => setSelectedType('landlord')}
                className={`p-6 rounded-xl border-2 cursor-pointer transition-all ${
                  selectedType === 'landlord'
                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-500/10'
                    : 'border-gray-200 dark:border-neutral-700 hover:border-purple-300 dark:hover:border-purple-600'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center text-white text-xl">
                    🏢
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">I'm a Landlord</h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                      Managing properties and building landlord reputation
                    </p>
                  </div>
                  {selectedType === 'landlord' && (
                    <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center text-white">
                      ✓
                    </div>
                  )}
                </div>
              </div>

              {/* Both Option */}
              <div
                onClick={() => setSelectedType('both')}
                className={`p-6 rounded-xl border-2 cursor-pointer transition-all ${
                  selectedType === 'both'
                    ? 'border-green-500 bg-green-50 dark:bg-green-500/10'
                    : 'border-gray-200 dark:border-neutral-700 hover:border-green-300 dark:hover:border-green-600'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white text-xl">
                    🏠
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">I'm Both</h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                      I rent properties and also manage my own rentals
                    </p>
                  </div>
                  {selectedType === 'both' && (
                    <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white">
                      ✓
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Create Button */}
          <div className="flex justify-center">
            <button
              onClick={handleCreateProfile}
              disabled={!selectedType || isCreating}
              className={`px-8 py-3 rounded-xl font-semibold transition-all ${
                selectedType
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700'
                  : 'bg-gray-200 dark:bg-neutral-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
              } ${isCreating ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isCreating ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 1L8.13 2.87L2.87 8.13L1 10L2.87 11.87L8.13 17.13L10 19L11.87 17.13L17.13 11.87L19 10L17.13 8.13L11.87 2.87L10 1Z"/>
                  </svg>
                  Creating Profile...
                </span>
              ) : (
                'Create Trust Profile'
              )}
            </button>
          </div>

          {/* Benefits */}
          <div className="mt-8 p-6 bg-gray-50 dark:bg-neutral-800 rounded-xl">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <span>🌟</span> What you'll get:
            </h3>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                Credit score-like reputation for rentals
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                Better rental opportunities with high trust scores
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                Transparent payment and rental history
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                Build credibility in the rental ecosystem
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}