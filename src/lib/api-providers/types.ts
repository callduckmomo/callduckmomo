export type ApiProvider = {
  id: string;
  name: string;
  displayName: string;
  apiKey: string | null;
  apiEndpoint: string;
  productEndpoint: string | null;
  buyEndpoint: string | null;
  historyEndpoint: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateApiProviderInput = {
  name: string;
  displayName: string;
  apiKey?: string | null;
  apiEndpoint: string;
  productEndpoint?: string | null;
  buyEndpoint?: string | null;
  historyEndpoint?: string | null;
  isActive?: boolean;
};

export type UpdateApiProviderInput = {
  displayName?: string;
  apiKey?: string | null;
  apiEndpoint?: string;
  productEndpoint?: string | null;
  buyEndpoint?: string | null;
  historyEndpoint?: string | null;
  isActive?: boolean;
};

