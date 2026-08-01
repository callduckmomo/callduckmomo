export interface VerifySlipResponse {
  success: boolean;
  data?: VerifySlipData;
  error?: string;
}

export interface VerifySlipData {
  message: string;
  pointsAdded: number;
  currentPoints: number;
  transactionAmount: number;
  minimumAmount: number;
}

// ===== Slip2Go API Types =====

export interface Slip2GoPayload {
  checkDuplicate?: boolean;
  checkReceiver?: Array<{
    accountType?: string;
    accountNameTH?: string;
    accountNameEN?: string;
    accountNumber?: string;
  }>;
  checkAmount?: {
    type?: "lte" | "eq" | "gte";
    amount: string;
  };
  checkDate?: {
    type?: "lte" | "eq" | "gte";
    date: string;
  };
}

export interface Slip2GoApiResponse {
  code: string;
  message: string;
  data?: Slip2GoSlipData;
}

export interface Slip2GoSlipData {
  referenceId?: string;
  decode?: string;
  transRef?: string;
  dateTime?: string;
  amount?: number;
  ref1?: string | null;
  ref2?: string | null;
  ref3?: string | null;
  receiver?: {
    account?: {
      name?: string;
      bank?: {
        account?: string | null;
      };
      proxy?: {
        type?: string | null;
        account?: string | null;
      } | null;
    };
    bank?: {
      id?: string;
      name?: string | null;
    };
  };
  sender?: {
    account?: {
      name?: string;
      bank?: {
        account?: string;
      };
    };
    bank?: {
      id?: string;
      name?: string | null;
    };
  };
}

// ===== Legacy RDCW API Types (kept for backward compatibility) =====

export interface RDCWApiRequest {
  payload: string;
}

export interface RDCWApiResponse {
  valid: boolean;
  data?: RDCWSlipData;
  error?: string;
}

export interface RDCWSlipData {
  transRef?: string;
  ref1?: string;
  amount: number;
  sender: {
    account: {
      value: string;
    };
    name?: string;
  };
  receiver: {
    account: {
      value: string;
    };
    name?: string;
  };
  transactionDate?: string;
  transactionTime?: string;
  transDate?: string;
  transTime?: string;
}

// ===== Database Types =====

export interface SlipHistory {
  id: string;
  userId: string;
  transactionId: string | null;
  amount: number;
  qrPayload: string;
  status: "success" | "failed" | "pending";
  createdAt: string;
}

// ===== Error Types =====

export class SlipVerificationError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = "SlipVerificationError";
  }
}

export const ErrorCodes = {
  UNAUTHORIZED: "UNAUTHORIZED",
  INVALID_QR: "INVALID_QR",
  INVALID_AMOUNT: "INVALID_AMOUNT",
  INVALID_ACCOUNT: "INVALID_ACCOUNT",
  DUPLICATE_SLIP: "DUPLICATE_SLIP",
  API_ERROR: "API_ERROR",
  DATABASE_ERROR: "DATABASE_ERROR",
} as const;

