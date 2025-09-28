import {
  AccountId,
  PrivateKey,
  Client,
  TokenCreateTransaction,
  TokenType,
  TokenMintTransaction,
  TokenAssociateTransaction,
  TransferTransaction,
  AccountBalanceQuery,
  AccountInfoQuery,
  Hbar
} from '@hashgraph/sdk'

// Hedera configuration
const MY_ACCOUNT_ID = AccountId.fromString(import.meta.env.VITE_HEDERA_ACCOUNT_ID || "0.0.6914602")

// Try to parse the private key - it could be either ED25519 or ECDSA format
export let MY_PRIVATE_KEY: PrivateKey
const privateKeyStr = import.meta.env.VITE_HEDERA_PRIVATE_KEY || "df36cca4c74d003cf80aae0b9ebc47247c4a608e7cfd296a6c4c9622fc4256c3"

console.log('Parsing private key, length:', privateKeyStr.length)

try {
  // First try ED25519 format (most common for Hedera)
  MY_PRIVATE_KEY = PrivateKey.fromStringED25519(privateKeyStr)
  console.log('Successfully parsed private key as ED25519')
} catch (error) {
  console.log('ED25519 parsing failed, trying ECDSA...')
  try {
    // Fallback to ECDSA format
    MY_PRIVATE_KEY = PrivateKey.fromStringECDSA(privateKeyStr)
    console.log('Successfully parsed private key as ECDSA')
  } catch (error2) {
    console.log('ECDSA parsing failed, trying generic fromString...')
    try {
      // Fallback to general fromString method
      MY_PRIVATE_KEY = PrivateKey.fromString(privateKeyStr)
      console.log('Successfully parsed private key with generic method')
    } catch (error3) {
      console.error('All private key parsing methods failed:', { error, error2, error3 })
      throw new Error('Invalid private key format. Please check your VITE_HEDERA_PRIVATE_KEY environment variable.')
    }
  }
}

let client: Client | null = null

export function getClient(): Client {
  if (!client) {
    client = Client.forTestnet()
    client.setOperator(MY_ACCOUNT_ID, MY_PRIVATE_KEY)
    
    // Set default max transaction fee and max query cost
    client.setDefaultMaxTransactionFee(new Hbar(100))
    client.setDefaultMaxQueryPayment(new Hbar(50))
  }
  return client
}

// Debug function to check account setup
export async function debugAccountSetup(): Promise<void> {
  try {
    const client = getClient()
    
    console.log('=== Hedera Account Debug ===')
    console.log('Account ID:', MY_ACCOUNT_ID.toString())
    console.log('Private Key Type:', MY_PRIVATE_KEY.constructor.name)
    console.log('Private Key (first 10 chars):', privateKeyStr.substring(0, 10) + '...')
    
    // Get the public key from private key
    const publicKey = MY_PRIVATE_KEY.publicKey
    console.log('Derived Public Key:', publicKey.toString())
    
    // Check account balance
    const balance = await new AccountBalanceQuery()
      .setAccountId(MY_ACCOUNT_ID)
      .execute(client)
    
    console.log('Account Balance:', balance.hbars.toString())
    
    // Check account info
    const accountInfo = await new AccountInfoQuery()
      .setAccountId(MY_ACCOUNT_ID)
      .execute(client)
      
    console.log('Account Key from Network:', accountInfo.key?.toString())
    console.log('Keys Match:', accountInfo.key?.toString() === publicKey.toString())
    console.log('Account is deleted:', accountInfo.isDeleted)
    
    // This is the critical check - if keys don't match, we have the wrong private key
    if (accountInfo.key?.toString() !== publicKey.toString()) {
      throw new Error('CRITICAL: Private key does not match the account key on Hedera network. This will cause INVALID_SIGNATURE errors.')
    }
    
    console.log('===========================')
    
    // Check if balance is sufficient
    if (balance.hbars.toTinybars().toNumber() < 5 * 100000000) {
      throw new Error('Insufficient HBAR balance. Need at least 5 HBAR for NFT operations.')
    }
    
    console.log('✅ Account setup validation passed!')
    
  } catch (error) {
    console.error('Account setup debug failed:', error)
    throw error
  }
}

export interface TokenCreationResult {
  tokenId: string
  transactionId: string
  status: string
  hashscanUrl: string
}

export interface NFTMintResult {
  tokenId: string
  serialNumber: string
  transactionId: string
  status: string
  hashscanUrl: string
}

// Create a fungible token
export async function createFungibleToken(
  tokenName: string = "Briq Token",
  tokenSymbol: string = "BRIQ",
  initialSupply: number = 5000
): Promise<TokenCreationResult> {
  const client = getClient()
  
  try {
    // Create the transaction and freeze for manual signing
    const txTokenCreate = await new TokenCreateTransaction()
      .setTokenName(tokenName)
      .setTokenSymbol(tokenSymbol)
      .setTokenType(TokenType.FungibleCommon)
      .setTreasuryAccountId(MY_ACCOUNT_ID)
      .setInitialSupply(initialSupply)
      .freezeWith(client)

    // Sign the transaction with the token treasury account private key
    const signTxTokenCreate = await txTokenCreate.sign(MY_PRIVATE_KEY)

    // Sign the transaction with the client operator private key and submit to a Hedera network
    const txTokenCreateResponse = await signTxTokenCreate.execute(client)

    // Get the receipt of the transaction
    const receiptTokenCreateTx = await txTokenCreateResponse.getReceipt(client)

    // Get the token ID from the receipt
    const tokenId = receiptTokenCreateTx.tokenId!

    // Get the transaction consensus status
    const statusTokenCreateTx = receiptTokenCreateTx.status

    // Get the Transaction ID
    const txTokenCreateId = txTokenCreateResponse.transactionId.toString()

    console.log("--------------------------------- Token Creation ---------------------------------")
    console.log("Receipt status           :", statusTokenCreateTx.toString())
    console.log("Transaction ID           :", txTokenCreateId)
    console.log("Hashscan URL             :", "https://hashscan.io/testnet/tx/" + txTokenCreateId)
    console.log("Token ID                 :", tokenId.toString())

    return {
      tokenId: tokenId.toString(),
      transactionId: txTokenCreateId,
      status: statusTokenCreateTx.toString(),
      hashscanUrl: "https://hashscan.io/testnet/tx/" + txTokenCreateId
    }
  } catch (error) {
    console.error('Error creating fungible token:', error)
    throw error
  }
}

// Create an NFT token
export async function createNFTToken(
  tokenName: string = "Briq User NFT",
  tokenSymbol: string = "BRIQNFT"
): Promise<TokenCreationResult> {
  const client = getClient()
  
  try {
    console.log('Creating NFT token with account:', MY_ACCOUNT_ID.toString())
    console.log('Token name:', tokenName, 'Symbol:', tokenSymbol)
    
    // Validate keys first
    const publicKey = MY_PRIVATE_KEY.publicKey
    console.log('Using public key:', publicKey.toString())
    
    // Create the transaction with minimal keys (only what's necessary)
    const txTokenCreate = new TokenCreateTransaction()
      .setTokenName(tokenName)
      .setTokenSymbol(tokenSymbol)
      .setTokenType(TokenType.NonFungibleUnique)
      .setTreasuryAccountId(MY_ACCOUNT_ID)
      .setSupplyKey(publicKey) // Use public key instead of private key
      .setMaxTransactionFee(new Hbar(30)) // Increase fee limit

    console.log('Transaction created, freezing...')
    
    // Freeze with client first
    const frozenTx = await txTokenCreate.freezeWith(client)
    
    console.log('Transaction frozen, signing...')
    
    // Sign explicitly
    const signedTx = await frozenTx.sign(MY_PRIVATE_KEY)
    
    console.log('Transaction signed, executing...')
    
    // Execute the signed transaction
    const txTokenCreateResponse = await signedTx.execute(client)

    // Get the receipt of the transaction
    const receiptTokenCreateTx = await txTokenCreateResponse.getReceipt(client)

    // Get the token ID from the receipt
    const tokenId = receiptTokenCreateTx.tokenId!

    // Get the transaction consensus status
    const statusTokenCreateTx = receiptTokenCreateTx.status

    // Get the Transaction ID
    const txTokenCreateId = txTokenCreateResponse.transactionId.toString()

    console.log("--------------------------------- NFT Creation ---------------------------------")
    console.log("Receipt status           :", statusTokenCreateTx.toString())
    console.log("Transaction ID           :", txTokenCreateId)
    console.log("Hashscan URL             :", "https://hashscan.io/testnet/tx/" + txTokenCreateId)
    console.log("Token ID                 :", tokenId.toString())

    return {
      tokenId: tokenId.toString(),
      transactionId: txTokenCreateId,
      status: statusTokenCreateTx.toString(),
      hashscanUrl: "https://hashscan.io/testnet/tx/" + txTokenCreateId
    }
  } catch (error) {
    console.error('Error creating NFT token:', error)
    throw error
  }
}

// Mint an NFT with metadata
export async function mintUserNFT(
  tokenId: string,
  userAddress: string,
  metadataString: string
): Promise<NFTMintResult> {
  const client = getClient()
  
  try {
    console.log('Starting NFT mint process...')
    console.log('Token ID:', tokenId)
    console.log('User Address:', userAddress)
    console.log('Metadata:', metadataString)
    console.log('Account ID:', MY_ACCOUNT_ID.toString())
    console.log('Private Key valid:', !!MY_PRIVATE_KEY)

    // Use provided metadata string
    const metadataBytes = new TextEncoder().encode(metadataString)
    
    console.log('Metadata size:', metadataBytes.length, 'bytes')

    // Create the mint transaction
    const txMint = new TokenMintTransaction()
      .setTokenId(tokenId)
      .setMetadata([metadataBytes])
      .setMaxTransactionFee(new Hbar(30)) // Increase fee limit
    
    console.log('Freezing mint transaction...')
    
    // Freeze the transaction with the client
    const frozenTxMint = await txMint.freezeWith(client)
    
    console.log('Signing mint transaction...')
    
    // Sign the transaction explicitly
    const signedTxMint = await frozenTxMint.sign(MY_PRIVATE_KEY)
    
    console.log('Executing signed mint transaction...')
    
    // Execute the signed transaction
    const txMintResponse = await signedTxMint.execute(client)

    // Get the receipt of the transaction
    const receiptMintTx = await txMintResponse.getReceipt(client)

    // Get the serial numbers from the receipt
    const serialNumbers = receiptMintTx.serials

    // Get the transaction consensus status
    const statusMintTx = receiptMintTx.status

    // Get the Transaction ID
    const txMintId = txMintResponse.transactionId.toString()

    console.log("--------------------------------- NFT Mint ---------------------------------")
    console.log("Receipt status           :", statusMintTx.toString())
    console.log("Transaction ID           :", txMintId)
    console.log("Hashscan URL             :", "https://hashscan.io/testnet/tx/" + txMintId)
    console.log("Serial Numbers           :", serialNumbers.map(s => s.toString()).join(", "))

    return {
      tokenId: tokenId,
      serialNumber: serialNumbers[0]?.toString() || "1",
      transactionId: txMintId,
      status: statusMintTx.toString(),
      hashscanUrl: "https://hashscan.io/testnet/tx/" + txMintId
    }
  } catch (error) {
    console.error('Error minting NFT:', error)
    throw error
  }
}

// Get user's NFT data from localStorage or create new one
export interface UserNFTData {
  tokenId: string
  serialNumber: string
  metadata: any
  transactionId: string
  hashscanUrl: string
}

export async function getUserNFT(userAddress: string): Promise<UserNFTData | null> {
  try {
    // For now, we'll keep minimal localStorage reference to track which NFT belongs to which user
    // In a full implementation, this would query the Hedera network for NFTs owned by the user
    const storageKey = `briq_user_nft_${userAddress}`
    const stored = localStorage.getItem(storageKey)
    
    if (stored) {
      const nftData = JSON.parse(stored)
      // Verify the NFT still exists on-chain by querying the network
      // This is where you'd implement actual Hedera NFT ownership verification
      return nftData
    }
    
    return null
  } catch (error) {
    console.error('Error getting user NFT:', error)
    return null
  }
}

export async function createUserNFT(userAddress: string, userName?: string): Promise<UserNFTData> {
  try {
    console.log('Creating NFT for user:', userAddress)
    
    // Debug account setup first
    await debugAccountSetup()
    
    // First create the NFT token collection if needed
    let nftTokenId = localStorage.getItem('briq_nft_token_id')
    
    if (!nftTokenId) {
      console.log('Creating new NFT token collection...')
      const tokenResult = await createNFTToken("Briq Trust Profiles", "BRIQT")
      nftTokenId = tokenResult.tokenId
      localStorage.setItem('briq_nft_token_id', nftTokenId)
      console.log('Created NFT collection with token ID:', nftTokenId)
    } else {
      console.log('Using existing NFT collection:', nftTokenId)
    }
    
    // Create initial minimal metadata for the NFT (stored on-chain)
    const initialMetadata = {
      user: userAddress.slice(0, 8),
      created: new Date().toISOString().split('T')[0],
      platform: "briq"
    }
    
    const metadataString = JSON.stringify(initialMetadata)
    console.log('Minting NFT with initial metadata:', metadataString)
    
    // Mint the NFT with minimal on-chain metadata
    const mintResult = await mintUserNFT(nftTokenId, userAddress, metadataString)
    console.log('NFT minted successfully:', mintResult)
    
    // Create user NFT data reference (minimal localStorage usage)
    const userNFTData: UserNFTData = {
      tokenId: mintResult.tokenId,
      serialNumber: mintResult.serialNumber,
      metadata: {
        name: `Briq Trust Profile ${userAddress.slice(0, 6)}`,
        description: `On-chain trust profile for Briq platform user`,
        image: `https://api.dicebear.com/7.x/identicon/svg?seed=${userAddress}`,
        external_url: `https://hashscan.io/testnet/token/${mintResult.tokenId}/${mintResult.serialNumber}`,
        onChainMetadata: initialMetadata
      },
      transactionId: mintResult.transactionId,
      hashscanUrl: mintResult.hashscanUrl
    }
    
    // Store minimal reference (in production, this would be queried from the network)
    const storageKey = `briq_user_nft_${userAddress}`
    localStorage.setItem(storageKey, JSON.stringify(userNFTData))
    
    return userNFTData
  } catch (error: any) {
    console.error('Error creating user NFT:', error)
    
    // Provide more specific error messages
    if (error.message?.includes('METADATA_TOO_LONG')) {
      throw new Error('Unable to create NFT: Metadata size exceeded. Please try with a shorter name.')
    } else if (error.message?.includes('INSUFFICIENT_ACCOUNT_BALANCE')) {
      throw new Error('Insufficient account balance to create NFT. Please ensure the Hedera account has enough HBAR.')
    } else if (error.message?.includes('TOKEN_NOT_FOUND')) {
      throw new Error('NFT token not found. Please try again.')
    } else {
      throw new Error(`NFT creation failed: ${error.message || 'Unknown error'}`)
    }
  }
}

export function closeClient() {
  if (client) {
    client.close()
    client = null
  }
}