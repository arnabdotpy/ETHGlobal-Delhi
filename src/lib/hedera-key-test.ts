// Simple script to test Hedera account and generate new keys if needed
import { AccountId, PrivateKey, Client, AccountCreateTransaction, Hbar } from '@hashgraph/sdk'

// Test with a new key generation to compare
export async function generateNewTestKey() {
  console.log('=== Generating Test Keys ===')
  
  // Generate a new ED25519 private key
  const newPrivateKey = PrivateKey.generateED25519()
  const newPublicKey = newPrivateKey.publicKey
  
  console.log('New Private Key (ED25519):', newPrivateKey.toString())
  console.log('New Public Key:', newPublicKey.toString())
  
  return {
    privateKey: newPrivateKey.toString(),
    publicKey: newPublicKey.toString()
  }
}

export async function testExistingKey() {
  const privateKeyStr = import.meta.env.VITE_HEDERA_PRIVATE_KEY || "df36cca4c74d003cf80aae0b9ebc47247c4a608e7cfd296a6c4c9622fc4256c3"
  
  console.log('=== Testing Existing Key ===')
  console.log('Private Key String:', privateKeyStr)
  console.log('Key Length:', privateKeyStr.length)
  
  try {
    // Try different parsing methods
    const methods = [
      { name: 'ED25519', method: () => PrivateKey.fromStringED25519(privateKeyStr) },
      { name: 'ECDSA', method: () => PrivateKey.fromStringECDSA(privateKeyStr) },
      { name: 'DER', method: () => PrivateKey.fromStringDer(privateKeyStr) },
      { name: 'Raw', method: () => PrivateKey.fromString(privateKeyStr) }
    ]
    
    for (const { name, method } of methods) {
      try {
        const key = method()
        const publicKey = key.publicKey
        console.log(`✅ ${name} parsing succeeded:`)
        console.log(`   Public Key: ${publicKey.toString()}`)
        console.log(`   Key Type: ${key.constructor.name}`)
      } catch (error: any) {
        console.log(`❌ ${name} parsing failed:`, error.message || error)
      }
    }
    
  } catch (error) {
    console.error('Key testing failed:', error)
  }
}

// Test if we can create a simple transaction
export async function testSimpleTransaction() {
  try {
    const accountId = AccountId.fromString(import.meta.env.VITE_HEDERA_ACCOUNT_ID || "0.0.6914602")
    const privateKey = PrivateKey.fromStringED25519(import.meta.env.VITE_HEDERA_PRIVATE_KEY || "df36cca4c74d003cf80aae0b9ebc47247c4a608e7cfd296a6c4c9622fc4256c3")
    
    const client = Client.forTestnet()
    client.setOperator(accountId, privateKey)
    client.setDefaultMaxTransactionFee(new Hbar(10))
    
    console.log('=== Testing Simple Transaction ===')
    console.log('Account ID:', accountId.toString())
    
    // Try a simple account create transaction (won't execute, just test signing)
    const transaction = new AccountCreateTransaction()
      .setKey(privateKey.publicKey)
      .setInitialBalance(new Hbar(0))
      .setMaxTransactionFee(new Hbar(2))
      .freezeWith(client)
    
    console.log('Transaction created and frozen successfully')
    
    // Test signing
    const signedTransaction = await transaction.sign(privateKey)
    console.log('✅ Transaction signed successfully - private key is valid!')
    
    return true
  } catch (error) {
    console.error('❌ Simple transaction test failed:', error)
    return false
  }
}

if (typeof window !== 'undefined') {
  const w = window as any
  w.generateNewTestKey = generateNewTestKey
  w.testExistingKey = testExistingKey  
  w.testSimpleTransaction = testSimpleTransaction
}