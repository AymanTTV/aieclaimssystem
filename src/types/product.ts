export interface Product {
  id: string;

  /** Inventory identifiers */
  partNumber: string;         // NEW: unique or semi-unique code
  name: string;               // Product Name
  category?: string;          // Category (keep as-is)

  /** Stock & location */
  binLocation?: string;       // NEW: Bin / Location (e.g., "Aisle 3 / Bin B")
  quantity: number;           // NEW: QTY in stock

  /** Pricing */
  retailPrice: number;        // NEW: Retail Price
  discount?: number;          // NEW: Discount (percentage, e.g., 10 for 10%)
  /** If you store it in DB, keep it; otherwise compute it on the fly */
  totalValue?: number;        // NEW: quantity * retailPrice * (1 - discount/100)

  /** Media */
  imageUrl?: string;          // Keep the file picture

  /** Optional metadata */
  description?: string;
  createdAt?: number;         // timestamp (ms)
  updatedAt?: number;         // timestamp (ms)
}
