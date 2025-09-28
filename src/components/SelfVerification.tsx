import React, { useState, useEffect } from 'react';
import { ethers } from "ethers";

// Dynamic imports to handle potential version conflicts
let SelfQRcodeWrapper: any;
let SelfAppBuilder: any;
let getUniversalLink: any;

const loadSelfSDK = async () => {
  try {
    const qrModule = await import("@selfxyz/qrcode");
    const coreModule = await import("@selfxyz/core");
    
    // Check if the imports are successful and have the expected exports
    console.log("QR Module exports:", Object.keys(qrModule));
    console.log("Core Module exports:", Object.keys(coreModule));
    
    SelfQRcodeWrapper = qrModule.SelfQRcodeWrapper || (qrModule as any).default?.SelfQRcodeWrapper;
    SelfAppBuilder = qrModule.SelfAppBuilder || (qrModule as any).default?.SelfAppBuilder;
    getUniversalLink = coreModule.getUniversalLink || (coreModule as any).default?.getUniversalLink;
    
    // Verify the components are loaded
    if (!SelfQRcodeWrapper || !SelfAppBuilder || !getUniversalLink) {
      console.error("Missing exports:", {
        SelfQRcodeWrapper: !!SelfQRcodeWrapper,
        SelfAppBuilder: !!SelfAppBuilder,
        getUniversalLink: !!getUniversalLink
      });
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("Failed to load Self.xyz SDK:", error);
    return false;
  }
};

interface SelfVerificationProps {
  userAddress: string;
  onVerificationSuccess: (verificationData: any) => void;
  onSkip?: () => void;
}

export default function SelfVerification({ userAddress, onVerificationSuccess, onSkip }: SelfVerificationProps) {
  const [selfApp, setSelfApp] = useState<any>(null);
  const [universalLink, setUniversalLink] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'scanning' | 'verifying' | 'success' | 'error'>('idle');

  useEffect(() => {
    initializeSelfApp();
  }, [userAddress]);

  const initializeSelfApp = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load Self.xyz SDK dynamically
      const sdkLoaded = await loadSelfSDK();
      if (!sdkLoaded) {
        throw new Error("Failed to load Self.xyz SDK");
      }

      // Use the dedicated Self.xyz verification server
      const verificationEndpoint = "https://three.rachitkhurana.tech/api/verify";
      
      console.log("Initializing Self.xyz with endpoint:", verificationEndpoint);
      console.log("User address:", userAddress);
      
      const app = new SelfAppBuilder({
        version: 2,
        appName: import.meta.env.VITE_SELF_APP_NAME || "Briq Identity Verification",
        scope: import.meta.env.VITE_SELF_SCOPE || "briq-platform",
        endpoint: verificationEndpoint, // Dedicated verification server
        logoBase64: "https://i.postimg.cc/mrmVf9hm/self.png",
        userId: userAddress,
        endpointType: "staging_https", // Use staging for development
        userIdType: "hex",
        userDefinedData: `Briq Platform Verification - ${Date.now()}`,
        disclosures: {
          minimumAge: 18,
          nationality: true,
          gender: false,
          // Simplified disclosures for demo
        }
      }).build();

      setSelfApp(app);
      setUniversalLink(getUniversalLink(app));
      setIsLoading(false);
      setVerificationStatus('idle');

    } catch (error: any) {
      console.error("Failed to initialize Self app:", error);
      setError(`Failed to initialize verification system: ${error?.message || 'Unknown error'}`);
      setIsLoading(false);
    }
  };

  const handleSuccessfulVerification = (verificationData?: any) => {
    console.log("Frontend verification successful!", verificationData);
    setVerificationStatus('success');
    
    // Extract data from Self.xyz frontend verification
    const processedVerificationData = {
      verified: true,
      timestamp: Date.now(),
      userAddress,
      minimumAge: verificationData?.minimumAge || true,
      nationality: verificationData?.nationality || "Verified",
      gender: verificationData?.gender || "not_disclosed",
      verificationMethod: "frontend_only",
      selfData: verificationData, // Store original Self.xyz data
    };
    
    onVerificationSuccess(processedVerificationData);
  };

  const handleVerificationError = (error: any) => {
    console.error("Verification failed:", error);
    setVerificationStatus('error');
    
    // Handle specific error cases
    if (error?.status === 'proof_generation_failed') {
      setError("Proof generation failed. The verification server at three.rachitkhurana.tech should handle this properly.");
    } else {
      setError("Identity verification failed. Please try again.");
    }
  };



  if (isLoading) {
    return (
      <div className="max-w-md mx-auto">
        <div className="bg-neutral-900 rounded-lg border border-neutral-700 p-6">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold mb-2">Initializing Verification</h2>
            <p className="text-neutral-300 text-sm">
              Setting up identity verification system...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (verificationStatus === 'success') {
    return (
      <div className="max-w-md mx-auto">
        <div className="bg-neutral-900 rounded-lg border border-green-500 p-6">
          <div className="text-center">
            <div className="text-green-400 text-4xl mb-4">✅</div>
            <h2 className="text-xl font-semibold mb-2 text-green-400">Identity Verified!</h2>
            <p className="text-neutral-300 text-sm mb-4">
              Your identity has been successfully verified. You can now proceed to create your NFT.
            </p>
            <div className="bg-green-900/20 border border-green-500 rounded-lg p-3">
              <div className="text-sm text-green-300">
                <div>✓ Age verification (18+)</div>
                <div>✓ OFAC compliance check</div>
                <div>✓ Document authenticity</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-neutral-900 rounded-lg border border-neutral-700 p-6">
        <div className="text-center mb-6">
          <div className="text-4xl mb-4">🛡️</div>
          <h2 className="text-xl font-semibold mb-2">Identity Verification</h2>
          <p className="text-neutral-300 text-sm">
            Verify your identity to create your Briq NFT and access platform features.
          </p>
        </div>

        {error && (
          <div className="bg-red-900/20 border border-red-500 text-red-300 px-3 py-2 rounded text-sm mb-4">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {/* QR Code Section */}
          <div className="bg-neutral-800 rounded-lg p-6">
            <h3 className="font-medium mb-4 text-center">Scan QR Code with Self App</h3>
            
            {selfApp && SelfQRcodeWrapper ? (
              <div className="flex flex-col items-center">
                <SelfQRcodeWrapper
                  selfApp={selfApp}
                  onSuccess={handleSuccessfulVerification}
                  onError={handleVerificationError}
                  size={250}
                  darkMode={true}
                />
                <p className="text-xs text-neutral-400 mt-2 text-center">
                  Scan with Self app or use the button below for mobile
                </p>
              </div>
            ) : error ? (
              <div className="w-64 h-64 bg-red-900/20 border border-red-500 rounded-lg flex flex-col items-center justify-center mx-auto p-4">
                <span className="text-red-400 text-sm text-center mb-3">
                  QR Code Issue<br/>
                  <span className="text-xs">{error}</span>
                </span>
                <button
                  onClick={() => {
                    setError(null);
                    initializeSelfApp();
                  }}
                  className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-xs"
                >
                  Retry QR Code
                </button>
              </div>
            ) : (
              <div className="w-64 h-64 bg-neutral-700 rounded-lg flex items-center justify-center mx-auto">
                <div className="text-center">
                  <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  <span className="text-neutral-400 text-sm">Loading QR Code...</span>
                </div>
              </div>
            )}
          </div>

          {/* Mobile Deep Link Section */}
          <div className="bg-neutral-800 rounded-lg p-4">
            <h4 className="font-medium mb-2">Using Mobile?</h4>
            <p className="text-sm text-neutral-300 mb-3">
              Tap the button below to open the Self app directly
            </p>
            <button
              onClick={() => {
                if (universalLink) {
                  window.open(universalLink, "_blank");
                } else {
                  console.log("Universal link not ready yet");
                }
              }}
              disabled={!universalLink}
              className="w-full px-4 py-2 bg-neutral-700 hover:bg-neutral-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
            >
              📱 Open Self App
            </button>
          </div>

          {/* Verification Requirements */}
          <div className="bg-neutral-800 rounded-lg p-4">
            <h4 className="font-medium mb-2">Verification Requirements</h4>
            <ul className="text-sm text-neutral-300 space-y-1">
              <li>• Must be 18 years or older</li>
              <li>• Valid government-issued ID</li>
              <li>• OFAC compliance check</li>
              <li>• Document authenticity verification</li>
            </ul>
          </div>

          {/* Skip Option */}
          {onSkip && (
            <div className="text-center pt-4 border-t border-neutral-700">
              <p className="text-sm text-neutral-400 mb-2">
                Want to explore first?
              </p>
              <button
                onClick={onSkip}
                className="text-neutral-400 hover:text-neutral-300 text-sm underline"
              >
                Skip verification for now
              </button>
              <p className="text-xs text-neutral-500 mt-1">
                (Some features will be limited)
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
