import { AccountId, PrivateKey, Client, AccountInfoQuery } from '@hashgraph/sdk'

// Test Hedera connection and configuration
export async function testHederaConfig(): Promise<void> {
  try {
    console.log('Testing Hedera configuration...')
    
    // Test environment variables
    const accountIdStr = import.meta.env.VITE_HEDERA_ACCOUNT_ID
    const privateKeyStr = import.meta.env.VITE_HEDERA_PRIVATE_KEY
    
    console.log('Account ID from env:', accountIdStr)
    console.log('Private key from env (first 10 chars):', privateKeyStr?.substring(0, 10) + '...')
    
    if (!accountIdStr || !privateKeyStr) {
      throw new Error('Missing Hedera environment variables')
    }
    
    // Test account ID parsing
    const accountId = AccountId.fromString(accountIdStr)
    console.log('Parsed Account ID:', accountId.toString())
    
    // Test private key parsing
    let privateKey: PrivateKey
    try {
      console.log('Trying ED25519 format...')
      privateKey = PrivateKey.fromStringED25519(privateKeyStr)
      console.log('✅ ED25519 format successful')
    } catch (ed25519Error) {
      console.log('ED25519 failed, trying ECDSA format...')
      try {
        privateKey = PrivateKey.fromStringECDSA(privateKeyStr)
        console.log('✅ ECDSA format successful')
      } catch (ecdsaError) {
        console.log('ECDSA failed, trying general format...')
        privateKey = PrivateKey.fromString(privateKeyStr)
        console.log('✅ General format successful')
      }
    }
    
    // Test client connection
    const client = Client.forTestnet()
    client.setOperator(accountId, privateKey)
    
    console.log('Testing connection to Hedera testnet...')
    
    // Test account info query
    const accountInfo = await new AccountInfoQuery()
      .setAccountId(accountId)
      .execute(client)
    
    console.log('✅ Account info retrieved successfully')
    console.log('Account balance:', accountInfo.balance.toString())
    console.log('Account key:', accountInfo.key?.toString().substring(0, 20) + '...')
    
    client.close()
    console.log('✅ Hedera configuration test passed!')
    
  } catch (error) {
    console.error('❌ Hedera configuration test failed:', error)
    throw error
  }
}

// Test function to check if the account has sufficient HBAR
export async function checkAccountBalance(): Promise<string> {
  try {
    const accountIdStr = import.meta.env.VITE_HEDERA_ACCOUNT_ID
    const privateKeyStr = import.meta.env.VITE_HEDERA_PRIVATE_KEY
    
    const accountId = AccountId.fromString(accountIdStr)
    let privateKey: PrivateKey
    
    try {
      privateKey = PrivateKey.fromStringED25519(privateKeyStr)
    } catch {
      try {
        privateKey = PrivateKey.fromStringECDSA(privateKeyStr)
      } catch {
        privateKey = PrivateKey.fromString(privateKeyStr)
      }
    }
    
    const client = Client.forTestnet()
    client.setOperator(accountId, privateKey)
    
    const accountInfo = await new AccountInfoQuery()
      .setAccountId(accountId)
      .execute(client)
    
    client.close()
    return accountInfo.balance.toString()
  } catch (error) {
    console.error('Error checking account balance:', error)
    throw error
  }
}