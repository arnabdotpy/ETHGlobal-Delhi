// Self.xyz Backend Verification API
// This is a Vercel serverless function for verifying Self.xyz proofs

// Note: Install @selfxyz/core package for actual verification
// For now, this is a mock implementation

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ 
      status: 'error', 
      message: 'Method not allowed' 
    });
  }

  try {
    const { attestationId, proof, publicSignals, userContextData } = req.body;

    // Validate required fields
    if (!proof || !publicSignals || !attestationId || !userContextData) {
      return res.status(400).json({
        status: 'error',
        result: false,
        message: 'Proof, publicSignals, attestationId and userContextData are required',
        error_code: 'MISSING_FIELDS'
      });
    }

    console.log('Received verification request:', {
      attestationId,
      userContextData,
      proofLength: proof?.length,
      publicSignalsLength: publicSignals?.length
    });

    // TODO: Uncomment when @selfxyz/core is installed
    /*
    const { SelfBackendVerifier, AllIds, DefaultConfigStore } = require('@selfxyz/core');
    
    const selfBackendVerifier = new SelfBackendVerifier(
      "briq-platform",
      process.env.SELF_ENDPOINT || "https://your-backend-url.com/api/verify",
      process.env.NODE_ENV !== 'production', // mockPassport: true for staging/dev
      AllIds,
      new DefaultConfigStore({
        minimumAge: 18,
        excludedCountries: ["IRN", "PRK", "RUS", "SYR"],
        ofac: true,
      }),
      "hex" // userIdentifierType for EVM addresses
    );

    // Verify the proof
    const result = await selfBackendVerifier.verify(
      attestationId,    // Document type (1 = passport, 2 = EU ID card, 3 = Aadhaar)
      proof,            // The zero-knowledge proof
      publicSignals,    // Public signals array
      userContextData   // User context data (hex string)
    );

    // Check if verification was successful
    if (result.isValidDetails.isValid) {
      return res.status(200).json({
        status: "success",
        result: true,
        credentialSubject: result.discloseOutput,
      });
    } else {
      return res.status(200).json({
        status: "error",
        result: false,
        reason: "Verification failed",
        error_code: "VERIFICATION_FAILED",
        details: result.isValidDetails,
      });
    }
    */

    // Skip signature verification - always return success for QR code demo
    // This allows the QR code flow to work without cryptographic verification
    console.log('Received Self.xyz verification request (signature verification skipped)');
    console.log('AttestationId:', attestationId);
    console.log('UserContextData:', userContextData);
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const mockResult = {
      status: "success",
      result: true,
      credentialSubject: {
        nationality: "US", // This would come from actual verification
        minimumAge: true,
        ofacCheck: true,
        gender: "prefer_not_to_say",
        verifiedAt: new Date().toISOString(),
        documentType: attestationId === "1" ? "passport" : "id_card"
      }
    };

    console.log('Mock verification successful (no signature check):', mockResult);
    
    return res.status(200).json(mockResult);

  } catch (error) {
    console.error('Verification error:', error);
    
    return res.status(500).json({
      status: "error",
      result: false,
      reason: error.message || "Unknown error",
      error_code: "INTERNAL_ERROR"
    });
  }
}
