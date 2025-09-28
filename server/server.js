import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3000;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'Self.xyz Verification Server'
  });
});

// Self.xyz verification endpoint
app.post('/api/verify', async (req, res) => {
  try {
    console.log('=== Self.xyz Verification Request ===');
    console.log('Timestamp:', new Date().toISOString());
    console.log('Headers:', req.headers);
    console.log('Body keys:', Object.keys(req.body));
    
    const { attestationId, proof, publicSignals, userContextData } = req.body;

    // Validate required fields
    if (!proof || !publicSignals || !attestationId || !userContextData) {
      console.log('❌ Missing required fields');
      return res.status(400).json({
        status: 'error',
        result: false,
        message: 'Proof, publicSignals, attestationId and userContextData are required',
        error_code: 'MISSING_FIELDS'
      });
    }

    console.log('✅ All required fields present');
    console.log('AttestationId:', attestationId);
    console.log('UserContextData:', userContextData);
    console.log('Proof length:', proof?.length);
    console.log('PublicSignals length:', publicSignals?.length);

    // TODO: Uncomment when you want real verification
    /*
    const { SelfBackendVerifier, AllIds, DefaultConfigStore } = await import('@selfxyz/core');
    
    const selfBackendVerifier = new SelfBackendVerifier(
      "briq-platform",
      "https://three.rachitkhurana.tech/api/verify",
      false, // mockPassport: false = mainnet, true = staging/testnet
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
      console.log('✅ Verification successful');
      return res.status(200).json({
        status: "success",
        result: true,
        credentialSubject: result.discloseOutput,
      });
    } else {
      console.log('❌ Verification failed');
      return res.status(200).json({
        status: "error",
        result: false,
        reason: "Verification failed",
        error_code: "VERIFICATION_FAILED",
        details: result.isValidDetails,
      });
    }
    */

    // Mock verification for demo (always succeeds)
    console.log('🎭 Using mock verification (always succeeds)');
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const mockResult = {
      status: "success",
      result: true,
      credentialSubject: {
        nationality: "US", // This would come from actual verification
        minimumAge: true,
        ofacCheck: true,
        gender: "prefer_not_to_say",
        verifiedAt: new Date().toISOString(),
        documentType: attestationId === "1" ? "passport" : "id_card",
        mockVerification: true
      }
    };

    console.log('✅ Mock verification successful:', mockResult);
    
    return res.status(200).json(mockResult);

  } catch (error) {
    console.error('❌ Verification error:', error);
    
    return res.status(500).json({
      status: "error",
      result: false,
      reason: error.message || "Unknown error",
      error_code: "INTERNAL_ERROR"
    });
  }
});

// Catch all for other routes
app.get('*', (req, res) => {
  res.json({ 
    message: 'Self.xyz Verification Server',
    endpoints: {
      health: 'GET /health',
      verify: 'POST /api/verify'
    }
  });
});

app.listen(PORT, () => {
  console.log('🚀 Self.xyz Verification Server started');
  console.log(`📡 Server running on port ${PORT}`);
  console.log(`🌐 Will be accessible at: https://three.rachitkhurana.tech`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`🛡️  Verify endpoint: http://localhost:${PORT}/api/verify`);
  console.log('=====================================');
});
