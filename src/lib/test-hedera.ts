import { createUserNFT, mintUserNFT } from './hedera'

// Test function to validate metadata size
export function testMetadataSize(userName: string, userAddress: string) {
  // Test the minimal metadata we're now using
  const minimalMetadata = userName.substring(0, 10)
  const metadataBytes = new TextEncoder().encode(minimalMetadata)
  
  console.log('=== NFT Metadata Size Test ===')
  console.log('User Name:', userName)
  console.log('Truncated Name:', minimalMetadata)
  console.log('Metadata Size:', metadataBytes.length, 'bytes')
  console.log('Hedera Limit: ~100 bytes')
  console.log('Status:', metadataBytes.length < 100 ? '✅ PASS' : '❌ FAIL')
  
  return {
    metadata: minimalMetadata,
    size: metadataBytes.length,
    withinLimit: metadataBytes.length < 100
  }
}

// Test with various name lengths
export function runMetadataTests() {
  const testCases = [
    'John',
    'John Doe',
    'A Very Long User Name That Might Cause Issues',
    'SuperLongUserNameThatDefinitelyExceedsLimits12345'
  ]
  
  console.log('Running metadata size tests...')
  
  testCases.forEach((name, index) => {
    console.log(`\nTest ${index + 1}:`)
    testMetadataSize(name, '0x1234567890123456789012345678901234567890')
  })
}