export type SupportCaseType = 'screen' | 'account';

export type SupportCaseStatus = 'pending' | 'resolved';

export type SupportCaseRecord = {
  id: string;
  case_code: string;
  user_id: string | null;
  order_id: string | null;
  product_type_id: string | null;
  product_name: string | null;
  account_email: string | null;
  account_password: string | null;
  expiration_date: string | null;
  case_type: SupportCaseType;
  screen_number: string | null;
  problem_description: string;
  status: SupportCaseStatus;
  admin_note: string | null;
  admin_response: string | null;
  created_at: string;
  updated_at: string;
  site_id?: string | null;
};

export type SupportCase = {
  id: string;
  caseCode: string;
  userId: string | null;
  orderId: string | null;
  productTypeId: string | null;
  productName: string | null;
  accountEmail: string | null;
  accountPassword: string | null;
  expirationDate: string | null;
  caseType: SupportCaseType;
  screenNumber: string | null;
  problemDescription: string;
  status: SupportCaseStatus;
  adminNote: string | null;
  adminResponse: string | null;
  createdAt: string;
  updatedAt: string;
  attachments?: SupportCaseAttachment[];
  siteId?: string | null;
  shopName?: string | null;
};

export type SupportCaseAttachment = {
  id: string;
  caseId: string;
  fileUrl: string;
  fileName: string | null;
  fileSize: number | null;
  mimeType: string | null;
  createdAt: string;
};

export type CreateSupportCaseInput = {
  caseCode?: string;
  orderId: string | null;
  productName: string | null;
  productTypeId: string | null;
  accountEmail: string | null;
  accountPassword: string | null;
  expirationDate: string | null;
  caseType: SupportCaseType;
  screenNumber: string | null;
  problemDescription: string;
};

export type UpdateSupportCaseInput = {
  status?: SupportCaseStatus;
  adminNote?: string | null;
  adminResponse?: string | null;
};

