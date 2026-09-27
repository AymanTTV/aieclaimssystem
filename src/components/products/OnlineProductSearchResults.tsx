// src/components/products/OnlineProductSearchResults.tsx
import React, { useState } from 'react';
import {
  Globe,
  ExternalLink,
  Plus,
  CheckCircle,
  Copy,
  Check,
  Search,
  Loader2,
  Tag,
  Wrench,
  DollarSign,
  Layers,
  ShoppingBag,
  Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { OnlineProductResult, getQuickOnlineRetailerLinks } from '../../services/onlineProductSearch.service';
import { Product } from '../../types/product';

interface OnlineProductSearchResultsProps {
  query: string;
  results: OnlineProductResult[];
  webSources?: { title: string; url: string }[];
  loading: boolean;
  existingProducts: Product[];
  onAddToInventory: (productData: Partial<Product>) => void;
  onViewExistingProduct?: (productId: string) => void;
  onSearchQueryChange?: (newQuery: string) => void;
}

export const OnlineProductSearchResults: React.FC<OnlineProductSearchResultsProps> = ({
  query,
  results,
  webSources = [],
  loading,
  existingProducts,
  onAddToInventory,
  onViewExistingProduct,
  onSearchQueryChange,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Build lookup of existing products by part number & name (case-insensitive & trimmed)
  const existingPartMap = new Map<string, Product>();
  const existingNameMap = new Map<string, Product>();

  existingProducts.forEach((p) => {
    if (p.partNumber) existingPartMap.set(p.partNumber.trim().toLowerCase(), p);
    if (p.name) existingNameMap.set(p.name.trim().toLowerCase(), p);
  });

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success(`Copied "${text}" to clipboard`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const quickRetailers = query ? getQuickOnlineRetailerLinks(query) : [];

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-blue-200 p-12 text-center shadow-xs flex flex-col items-center justify-center space-y-4">
        <div className="relative">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200">
            <Globe className="w-7 h-7 animate-pulse" />
          </div>
          <div className="absolute -bottom-1 -right-1 p-1 bg-white rounded-full shadow-xs">
            <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
          </div>
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900">Searching Online Automotive Catalogs…</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md">
            Querying Google Search grounding, OEM parts references, UK retailer pricing, and compatibility data for &ldquo;{query}&rdquo;
          </p>
        </div>
      </div>
    );
  }

  if (!query) {
    return (
      <div className="bg-gradient-to-b from-blue-50/50 to-white rounded-2xl border border-blue-100 p-10 text-center shadow-xs">
        <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center border border-blue-200">
          <Globe className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-bold text-slate-900">Online Auto Parts Search</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
          Type a part name, OEM number (e.g. <em>0986479042</em>), vehicle model, or consumable (e.g. <em>5W-30 oil</em>) above to search online catalogs and live market pricing.
        </p>

        {/* Suggested Quick Searches */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {['Ford Transit Brake Pads', 'Bosch Oil Filter', '5W-30 Fully Synthetic 5L', 'Alternator 12V 150A', 'DOT 4 Brake Fluid'].map((sample) => (
            <button
              key={sample}
              type="button"
              onClick={() => onSearchQueryChange && onSearchQueryChange(sample)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-blue-400 hover:text-blue-700 text-xs font-semibold text-slate-600 shadow-2xs transition-colors cursor-pointer"
            >
              <Search className="w-3 h-3 text-slate-400" />
              {sample}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* QUICK RETAILER DIRECT LAUNCH BAR */}
      <div className="p-3.5 bg-gradient-to-r from-slate-50 via-blue-50/40 to-slate-50 border border-slate-200 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-2">
          <ShoppingBag className="w-4 h-4 text-blue-600 flex-shrink-0" />
          <span className="text-xs font-bold text-slate-700">Live Supplier Direct Links for &ldquo;{query}&rdquo;:</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {quickRetailers.map((ret) => (
            <a
              key={ret.name}
              href={ret.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border transition-colors shadow-2xs ${ret.color}`}
            >
              <span>{ret.name}</span>
              <span className="text-[10px] opacity-75 font-normal">({ret.badge})</span>
              <ExternalLink className="w-3 h-3 opacity-60" />
            </a>
          ))}
        </div>
      </div>

      {/* RESULTS HEADER */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-blue-100 text-blue-700">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Online Automotive Results ({results.length} found)
          </span>
        </div>
        <span className="text-[11px] text-slate-500 font-medium">
          Click &ldquo;+ Add to Inventory&rdquo; to save directly into your database
        </span>
      </div>

      {results.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500 shadow-xs">
          <p className="text-sm font-semibold text-slate-700">No structured parts found for this specific query.</p>
          <p className="text-xs text-slate-400 mt-1">Try searching with a brand name or part number, or check the supplier direct links above.</p>
        </div>
      ) : (
        /* RESULTS GRID / CARDS */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {results.map((item) => {
            const partLower = item.partNumber?.trim().toLowerCase() || '';
            const nameLower = item.name?.trim().toLowerCase() || '';
            const existing = (partLower && existingPartMap.get(partLower)) || (nameLower && existingNameMap.get(nameLower));
            const isAlreadyInDb = !!existing;

            return (
              <div
                key={item.id}
                className={`bg-white rounded-2xl border transition-all p-5 flex flex-col justify-between shadow-2xs hover:shadow-md ${
                  isAlreadyInDb
                    ? 'border-emerald-200 bg-emerald-50/20 ring-1 ring-emerald-500/20'
                    : 'border-slate-200 hover:border-blue-300'
                }`}
              >
                <div>
                  {/* TOP ROW: PART NUMBER & BADGES */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 text-white font-mono text-xs font-bold shadow-2xs">
                        <Tag className="w-3 h-3 text-blue-400" />
                        {item.partNumber}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(item.partNumber, item.id)}
                        className="text-slate-400 hover:text-slate-700 p-1 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
                        title="Copy Part Number"
                      >
                        {copiedId === item.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {item.brand && (
                        <span className="px-2 py-0.5 rounded-md bg-blue-50 border border-blue-200 text-blue-800 text-[11px] font-bold">
                          {item.brand}
                        </span>
                      )}
                    </div>

                    {/* ESTIMATED PRICE */}
                    {item.estimatedPrice > 0 && (
                      <div className="text-right">
                        <span className="text-base font-black font-mono text-emerald-700">
                          £{item.estimatedPrice.toFixed(2)}
                        </span>
                        <p className="text-[10px] text-slate-400 font-medium">Est. UK Retail</p>
                      </div>
                    )}
                  </div>

                  {/* PRODUCT NAME & CATEGORY */}
                  <h4 className="text-sm font-bold text-slate-900 leading-snug">{item.name}</h4>

                  <div className="flex flex-wrap items-center gap-2 mt-1.5">
                    {item.category && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                        <Layers className="w-3 h-3 text-slate-400" />
                        {item.category}
                      </span>
                    )}
                    {item.compatibility && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                        <Wrench className="w-3 h-3 text-amber-600" />
                        {item.compatibility}
                      </span>
                    )}
                  </div>

                  {/* DESCRIPTION */}
                  {item.description && (
                    <p className="text-xs text-slate-600 mt-2.5 line-clamp-2 leading-relaxed font-normal">
                      {item.description}
                    </p>
                  )}

                  {/* SOURCES / REFERENCE SITES */}
                  {item.sources && item.sources.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Sources:</span>
                      {item.sources.map((s, sIdx) => (
                        <a
                          key={sIdx}
                          href={s.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:underline bg-blue-50/60 px-2 py-0.5 rounded transition-colors"
                        >
                          {s.title}
                          <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>

                {/* BOTTOM ACTION BAR */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  {isAlreadyInDb ? (
                    <div className="flex items-center justify-between w-full">
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-100/70 border border-emerald-300 px-2.5 py-1 rounded-xl shadow-2xs">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                        Already in Inventory
                      </span>
                      {onViewExistingProduct && existing && (
                        <button
                          type="button"
                          onClick={() => onViewExistingProduct(existing.id)}
                          className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                        >
                          View in DB →
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-between w-full">
                      <span className="text-[11px] text-slate-400 font-medium">New Discovered Part</span>
                      <button
                        type="button"
                        onClick={() =>
                          onAddToInventory({
                            partNumber: item.partNumber,
                            name: item.name,
                            category: item.category,
                            retailPrice: item.estimatedPrice,
                            binLocation: item.binLocation || 'Aisle 1',
                            description: `${item.description || ''} ${item.compatibility ? `\nCompatibility: ${item.compatibility}` : ''}`.trim(),
                            quantity: 1,
                            discount: 0,
                          })
                        }
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow transition-all cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        + Add to Inventory
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* WEB GROUNDING SOURCES CITATIONS */}
      {webSources && webSources.length > 0 && (
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500">
          <span className="font-bold text-slate-700 mr-2">Grounding Web References:</span>
          {webSources.map((source, idx) => (
            <a
              key={idx}
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-blue-600 hover:underline mr-3"
            >
              {source.title}
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
};

export default OnlineProductSearchResults;
