// src/types/product.ts
export interface Product {
  id: string;

  /** Inventory identifiers */
  partNumber: string;         // unique or semi-unique code
  name: string;               // Product Name
  category?: string;          // Category (keep as-is)

  /** Stock & location */
  binLocation?: string;       // Bin / Location (e.g., "Aisle 3 / Bin B")
  quantity: number;           // QTY in stock

  /** Pricing */
  retailPrice: number;        // Retail Price
  discount?: number;          // Discount (percentage, e.g., 10 for 10%)
  totalValue?: number;        // quantity * retailPrice * (1 - discount/100)

  /** Vehicle Association */
  vehicleId?: string;         // NEW: Associated Vehicle ID
  vehicleName?: string;       // NEW: Associated Vehicle Name

  /** Media */
  imageUrl?: string;          // Keep the file picture

  /** Optional metadata */
  description?: string;
  createdAt?: number;         // timestamp (ms)
  updatedAt?: number;         // timestamp (ms)
}