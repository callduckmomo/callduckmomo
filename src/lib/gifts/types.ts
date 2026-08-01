export type GiftOption = {
  id: string;
  baseProductTypeId: string;
  giftProductTypeId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type OrderGift = {
  id: string;
  orderId: string;
  giftProductTypeId: string;
  giftProductName: string;
  giftProductDetails: string | null;
  giftAccountEmail: string | null;
  giftAccountPassword: string | null;
  createdAt: string;
};


