export interface MasterProduct {
  id: string;
  typeId: string;
  type_id?: string;
  name: string;
  description: string;
  image_url: string;
  cost_price: number;
  price?: number;
  category?: string;
  category_id?: string | null;
  type_menu?: string | null;
  status?: string;
  stock?: number;
}

export interface LocalProduct extends MasterProduct {
  selling_price: number | null; // null if not set by admin yet
}
