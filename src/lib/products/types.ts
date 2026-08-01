export type ExternalProduct = {
  name: string;
  imageapi: string;
  details: string;
  price: number;
  pricevip: number;
  pricewalkin?: number;
  stock: number;
  type_menu: string;
  type_id: string;
};

export type ProductAccount = {
  email: string;
  password: string;
  details: string; // เก็บข้อมูลทั้งหมดของบัญชี (raw text)
};

export type ProductRecord = {
  id: string;
  type_id: string;
  name: string;
  image_url: string | null;
  details: string | null;
  price: number | null;
  price_vip: number | null;
  cost_price: number | null;
  price_walkin: number | null;
  stock: number | null;
  type_menu: string | null;
  category_id: string | null;
  account_email: string | null;
  account_password: string | null;
  account_data: ProductAccount[] | null;
  is_published: boolean;
  api_provider_id: string | null;
  badge: 'hot_sale' | 'recommended' | null;
  created_at: string;
  updated_at: string;
};

export type Product = {
  id: string;
  typeId: string;
  name: string;
  imageUrl: string | null;
  typeImageUrl: string | null;
  details: string | null;
  price: number | null;
  mainPrice?: number | null;
  priceVip: number | null;
  costPrice: number | null;
  priceWalkin: number | null;
  stock: number | null;
  typeMenu: string | null;
  categoryId: string | null;
  accountEmail: string | null;
  accountPassword: string | null;
  accountData: ProductAccount[] | null;
  isPublished: boolean;
  apiProviderId: string | null;
  badge: 'hot_sale' | 'recommended' | null;
  createdAt: string;
  updatedAt: string;
};

export type CategoryRecord = {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Category = {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

