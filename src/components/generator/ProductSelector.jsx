import { useState, useRef, useEffect } from "react";
import { useProducts } from "../../hooks/useProducts";
import Badge from "../ui/Badge";
import Card from "../ui/Card";

const PRODUCT_TYPE_COLORS = {
  ebook: "blue",
  template: "purple",
  course: "green",
  membership: "yellow",
  service: "pink",
  digital: "gray",
  physical: "gray",
};

function formatPrice(price) {
  if (!price && price !== 0) return null;
  return `Rp ${price.toLocaleString("id-ID")}`;
}

/**
 * TruncatedText — shows first N chars with expand toggle.
 */
function TruncatedText({ text, maxLength = 100 }) {
  const [expanded, setExpanded] = useState(false);

  if (!text) return <span className="text-gray-400">-</span>;

  if (text.length <= maxLength) {
    return (
      <span className="text-gray-600 text-xs whitespace-pre-line">{text}</span>
    );
  }

  return (
    <span className="text-gray-600 text-xs whitespace-pre-line">
      {expanded ? text : `${text.slice(0, maxLength)}...`}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setExpanded(!expanded);
        }}
        className="ml-1 text-primary-600 hover:text-primary-700 font-medium"
      >
        {expanded ? "Sembunyikan" : "Selengkapnya"}
      </button>
    </span>
  );
}

/**
 * ProductPreviewCard — collapsible rich preview of a selected product.
 */
function ProductPreviewCard({ product }) {
  const [showFull, setShowFull] = useState(false);

  if (!product) return null;

  const hasDiscount =
    product.original_price && product.original_price > (product.price || 0);

  return (
    <Card className="mt-2 p-3 bg-gray-50/80 border-gray-200">
      {/* Header row: name, type, price */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-sm font-semibold text-gray-900 truncate">
              {product.name}
            </h4>
            <Badge color={PRODUCT_TYPE_COLORS[product.product_type] || "gray"}>
              {product.product_type || "digital"}
            </Badge>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm font-bold text-primary-700">
              {formatPrice(product.price)}
            </span>
            {hasDiscount && (
              <span className="text-xs text-gray-400 line-through">
                {formatPrice(product.original_price)}
              </span>
            )}
            {product.discount_label && (
              <span className="text-[10px] font-semibold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
                {product.discount_label}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Key fields — always visible */}
      <div className="mt-3 space-y-2">
        {product.target_buyer && (
          <div>
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
              Target Buyer
            </span>
            <div className="mt-0.5">
              <TruncatedText text={product.target_buyer} maxLength={100} />
            </div>
          </div>
        )}

        {product.usp && (
          <div>
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
              USP
            </span>
            <p className="text-xs text-gray-600 mt-0.5">{product.usp}</p>
          </div>
        )}

        {product.transformation && (
          <div>
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
              Transformasi
            </span>
            <div className="mt-0.5">
              <TruncatedText text={product.transformation} maxLength={100} />
            </div>
          </div>
        )}

        {product.features && product.features.length > 0 && (
          <div>
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
              Fitur
            </span>
            <div className="flex flex-wrap gap-1 mt-1">
              {product.features.map((f, i) => (
                <span
                  key={i}
                  className="text-[10px] bg-white border-gray-200 text-gray-600 px-1.5 py-0.5 rounded"
                >
                  {f}
                </span>
              ))}
            </div>
          </div>
        )}

        {product.social_proof && (
          <div>
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
              Social Proof
            </span>
            <div className="mt-0.5">
              <TruncatedText text={product.social_proof} maxLength={80} />
            </div>
          </div>
        )}
      </div>

      {/* Expandable extra fields */}
      {showFull && (
        <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
          {product.description && (
            <div>
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                Deskripsi
              </span>
              <p className="text-xs text-gray-600 mt-0.5 whitespace-pre-line">
                {product.description}
              </p>
            </div>
          )}

          {product.outline && (
            <div>
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                Isi Produk
              </span>
              <p className="text-xs text-gray-600 mt-0.5 whitespace-pre-line">
                {product.outline}
              </p>
            </div>
          )}

          {product.competitors && (
            <div>
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                Perbandingan Kompetitor
              </span>
              <p className="text-xs text-gray-600 mt-0.5 whitespace-pre-line">
                {product.competitors}
              </p>
            </div>
          )}

          {product.bonus_offers && (
            <div>
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                Bonus & Offer
              </span>
              <p className="text-xs text-gray-600 mt-0.5 whitespace-pre-line">
                {product.bonus_offers}
              </p>
            </div>
          )}

          {product.objections && (
            <div>
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                FAQ / Objection Handling
              </span>
              <p className="text-xs text-gray-600 mt-0.5 whitespace-pre-line">
                {product.objections}
              </p>
            </div>
          )}

          {product.link && (
            <div>
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                Link Produk
              </span>
              <p className="text-xs text-primary-600 mt-0.5 truncate">
                {product.link}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Toggle detail button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setShowFull(!showFull);
        }}
        className="mt-2 text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1 transition-colors"
      >
        <span>{showFull ? "▲" : "▼"}</span>
        <span>{showFull ? "Sembunyikan detail" : "Lihat detail lengkap"}</span>
      </button>
    </Card>
  );
}

/**
 * ProductSelector — dropdown with rich product preview for generator pages.
 * @param {Object} props
 * @param {Object|null} props.value — currently selected product object (or null)
 * @param {(product: Object|null) => void} props.onChange — called when selection changes
 * @param {string} [props.className] — optional extra className
 */
export default function ProductSelector({ value, onChange, className = "" }) {
  const { products, loading } = useProducts();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);

  const hasProducts = products && products.length > 0;

  // Close on click outside
  useEffect(() => {
    if (!open) return;

    function handleClickOutside(e) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    }

    function handleEscape(e) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  function handleSelect(product) {
    onChange?.(product);
    setOpen(false);
  }

  return (
    <div className={`relative ${className}`}>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        <span className="flex items-center gap-1.5">
          📦 Produk
          <span className="text-xs font-normal text-gray-400">(opsional)</span>
        </span>
      </label>

      {/* Trigger button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen(!open)}
        className={`
          w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left text-sm transition-colors
          ${
            open
              ? "border-primary-400 ring-2 ring-primary-100 bg-white"
              : value
                ? "border-primary-200 bg-primary-50/30 hover:border-primary-300"
                : "border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-white"
          }
        `}
      >
        {loading ? (
          <span className="text-gray-400 text-sm flex items-center gap-2">
            <svg
              className="animate-spin h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 5.373 0 12h4z"
              />
            </svg>
            Memuat produk...
          </span>
        ) : (
          <>
            <span className="flex-1 min-w-0 truncate">
              {value ? (
                <span className="flex items-center gap-2">
                  <span className="font-medium text-gray-800 truncate">
                    {value.name}
                  </span>
                  <Badge
                    color={PRODUCT_TYPE_COLORS[value.product_type] || "gray"}
                  >
                    {value.product_type || "digital"}
                  </Badge>
                </span>
              ) : (
                <span className="text-gray-500">Tanpa produk spesifik</span>
              )}
            </span>
            {value && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange?.(null);
                }}
                className="flex-shrink-0 p-0.5 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
                title="Hapus pilihan produk"
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
            <svg
              className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          ref={dropdownRef}
          className="absolute z-50 mt-1 w-full max-h-[300px] overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-xl"
        >
          {/* No product option */}
          <button
            type="button"
            onClick={() => handleSelect(null)}
            className={`
              w-full text-left px-3 py-2.5 text-sm transition-colors border-b border-gray-100
              ${
                !value
                  ? "bg-primary-50 text-primary-800 font-medium"
                  : "hover:bg-gray-50 text-gray-600"
              }
            `}
          >
            <span className="flex items-center gap-2">
              <span
                className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                  !value
                    ? "border-primary-500 bg-primary-500"
                    : "border-gray-300"
                }`}
              >
                {!value && (
                  <svg
                    className="w-2.5 h-2.5 text-white"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4a1 1 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </span>
              Tanpa produk spesifik
            </span>
          </button>

          {/* Product list */}
          {!hasProducts ? (
            <div className="px-3 py-6 text-center">
              <p className="text-sm text-gray-500">📦</p>
              <p className="text-sm font-medium text-gray-700 mt-1">
                Belum ada produk.
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                Tambah di Onboarding.
              </p>
            </div>
          ) : (
            products.map((product) => {
              const isSelected = value?.id === product.id;
              const hasDiscount =
                product.original_price &&
                product.original_price > (product.price || 0);

              return (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => handleSelect(product)}
                  className={`
                    w-full text-left px-3 py-2.5 flex items-center gap-3 transition-colors
                    ${
                      isSelected
                        ? "bg-primary-50 text-primary-800"
                        : "hover:bg-gray-50 text-gray-700"
                    }
                  `}
                >
                  {/* Selection indicator */}
                  <span
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      isSelected
                        ? "border-primary-500 bg-primary-500"
                        : "border-gray-300"
                    }`}
                  >
                    {isSelected && (
                      <svg
                        className="w-2.5 h-2.5 text-white"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </span>

                  {/* Product info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">
                        {product.name}
                      </span>
                      <Badge
                        color={
                          PRODUCT_TYPE_COLORS[product.product_type] || "gray"
                        }
                      >
                        {product.product_type || "digital"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-xs font-semibold text-primary-700">
                        {formatPrice(product.price)}
                      </span>
                      {hasDiscount && (
                        <span className="text-[10px] text-gray-400 line-through">
                          {formatPrice(product.original_price)}
                        </span>
                      )}
                      {product.discount_label && (
                        <span className="text-[10px] font-semibold text-red-600">
                          {product.discount_label}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}

      {/* Preview card when a product is selected */}
      {value && <ProductPreviewCard product={value} />}
    </div>
  );
}
