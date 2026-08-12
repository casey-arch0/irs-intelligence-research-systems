/**
 * Payment / capability-unlock abstraction.
 *
 * IRS is entirely free during the current phase. Nothing in this module is
 * wired into the product surfaces: no wallet addresses, no prices, no locks.
 * It exists so a verification provider can be dropped in later without
 * reworking the products themselves.
 */

export type VerificationState =
  | "disabled"
  | "waiting"
  | "checking"
  | "verified"
  | "invalid"
  | "already-redeemed"
  | "unsupported-network"
  | "incorrect-payment"
  | "pending-confirmation";

export interface VerificationRequest {
  transactionHash: string;
  network: string;
}

export interface VerificationResult {
  state: VerificationState;
  message: string;
  network?: string;
  transactionHash?: string;
  recipient?: string;
  amount?: string;
  confirmations?: number;
  unlocked?: boolean;
}

export interface VerificationProvider {
  readonly id: string;
  readonly enabled: boolean;
  supportedNetworks(): string[];
  verify(request: VerificationRequest): Promise<VerificationResult>;
}

/**
 * The only provider that exists today. It never reports success, because no
 * verification actually happens — claiming otherwise would be a lie to the user.
 */
export const disabledProvider: VerificationProvider = {
  id: "disabled",
  enabled: false,
  supportedNetworks: () => [],
  async verify() {
    return {
      state: "disabled",
      message:
        "Payment verification is not active. Every IRS capability is currently free and unlocked.",
    };
  },
};

let activeProvider: VerificationProvider = disabledProvider;

export function setVerificationProvider(provider: VerificationProvider) {
  activeProvider = provider;
}

export function getVerificationProvider(): VerificationProvider {
  return activeProvider;
}

/** Capability gate. Always open while monetization is inactive. */
export function isCapabilityUnlocked(_capabilityId: string): boolean {
  return true;
}

export const VERIFICATION_STATE_LABEL: Record<VerificationState, string> = {
  disabled: "Disabled",
  waiting: "Waiting",
  checking: "Checking",
  verified: "Verified",
  invalid: "Invalid",
  "already-redeemed": "Already redeemed",
  "unsupported-network": "Unsupported network",
  "incorrect-payment": "Incorrect payment",
  "pending-confirmation": "Pending confirmation",
};
