import React, { useState } from 'react'
import { testHederaConfig, checkAccountBalance } from '../lib/hedera-test'

export default function HederaDebugPanel() {
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<string | null>(null)
  const [balance, setBalance] = useState<string | null>(null)

  const handleTestConfig = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      await testHederaConfig()
      setTestResult('✅ Hedera configuration is valid!')
    } catch (error: any) {
      setTestResult(`❌ Configuration error: ${error.message}`)
    } finally {
      setTesting(false)
    }
  }

  const handleCheckBalance = async () => {
    setTesting(true)
    try {
      const bal = await checkAccountBalance()
      setBalance(bal)
    } catch (error: any) {
      setBalance(`Error: ${error.message}`)
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-4">
      <h3 className="text-lg font-semibold mb-4 text-yellow-400">🔧 Hedera Debug Panel</h3>
      
      <div className="space-y-3">
        <div className="flex gap-2">
          <button
            onClick={handleTestConfig}
            disabled={testing}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded text-sm transition-colors"
          >
            {testing ? 'Testing...' : 'Test Configuration'}
          </button>
          
          <button
            onClick={handleCheckBalance}
            disabled={testing}
            className="px-3 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded text-sm transition-colors"
          >
            {testing ? 'Checking...' : 'Check Balance'}
          </button>
        </div>

        {testResult && (
          <div className={`p-3 rounded text-sm ${
            testResult.includes('✅') 
              ? 'bg-green-900/20 border border-green-500/30 text-green-400' 
              : 'bg-red-900/20 border border-red-500/30 text-red-400'
          }`}>
            {testResult}
          </div>
        )}

        {balance && (
          <div className="p-3 rounded text-sm bg-blue-900/20 border border-blue-500/30">
            <strong>Account Balance:</strong> {balance}
          </div>
        )}

        <div className="text-xs text-gray-400 space-y-1">
          <div><strong>Account ID:</strong> {import.meta.env.VITE_HEDERA_ACCOUNT_ID || 'Not set'}</div>
          <div><strong>Private Key:</strong> {import.meta.env.VITE_HEDERA_PRIVATE_KEY ? 'Set (hidden)' : 'Not set'}</div>
        </div>
      </div>
    </div>
  )
}