/* =====================================================================
   THE EPOXY STUDIO — STORE SETTINGS
   Products are NOT edited here any more — they come from
   data/products.xlsx (see "How to use" in that file).
   This file holds the settings that rarely change: shipping, COD,
   coupons, categories and crafts.
   ===================================================================== */
(function (root) {
  let PRODUCTS = [];
  if (typeof module !== 'undefined' && module.exports) {
    try { PRODUCTS = require('./products.js'); } catch (e) { PRODUCTS = []; }
  } else {
    PRODUCTS = root.TES_PRODUCTS || [];
  }

  const CATALOG = {
    store: {
      name: 'The Epoxy Studio',
      currency: 'INR',
      freeShippingAbove: 0,     // 0 = free shipping on every order
      shippingFee: 0,           // charged when below freeShippingAbove
      codFee: 0,                // extra charge for cash on delivery (0 = none)
      codMaxOrder: 5000,        // hide COD above this order value (0 = no limit)
      // Shiprocket parcel defaults — used when a size has no "Shipping weight" / "Box size" in Excel
      shipping: { defaultWeightKg: 0.5, box: { l: 20, b: 15, h: 10 } }
    },

    // Coupon codes the server will accept. Use percent OR flat (₹).
    coupons: {
      NEW10: { percent: 10, label: '10% off your first order' }
    },

    // The "Category" column in the Excel file must use one of these names.
    categories: [
      { id: 'resin',      name: 'Art Resin' },
      { id: 'pigments',   name: 'Pigments & Inks' },
      { id: 'kits',       name: 'Starter Kits' },
      { id: 'tools',      name: 'Moulds & Tools' },
      // business: true → listed under "For business" in the footer instead of the main menu
      { id: 'industrial', name: 'Industrial Epoxy', business: true },
      { id: 'grout',      name: 'Epoxy Grout',      business: true }
    ],

    // Each craft is a Yes/No column in the Excel file (column title = name).
    crafts: [
      { id: 'wall-art',     name: 'Wall art & canvas',     uses: 'Top Coat + mica',   tint: '#CFE3E6' },
      { id: 'coasters',     name: 'Coasters & trays',      uses: 'Standard + moulds', tint: '#E8DDCB' },
      { id: 'jewellery',    name: 'Jewellery & keychains', uses: 'Standard + inks',   tint: '#E6D6E4' },
      { id: 'geode',        name: 'Geode & ocean art',     uses: 'Pro Epoxy + mica',  tint: '#D6DCEC' },
      { id: 'river-table',  name: 'River tables',          uses: 'Deep Pour',         tint: '#D9E2D3' },
      { id: 'preservation', name: 'Flower preservation',   uses: 'Deep Pour, clear',  tint: '#F0DCD7' }
    ],

    // Only products marked "Show on website = Yes" in Excel
    products: PRODUCTS.filter((p) => p.visible !== false).sort((a, b) => (a.sort || 999) - (b.sort || 999))
  };

  /* ---------- shared helpers (used by browser AND server) ---------- */
  const r2 = (n) => Math.round(n * 100) / 100;          // keep paise exact (e.g. ₹466.10)
  CATALOG.hasProducts = (catId) => CATALOG.products.some((p) => p.category === catId);
  CATALOG.findProduct = (id) => CATALOG.products.find((p) => p.id === id);
  CATALOG.findVariant = (p, vid) => (p ? p.variants.find((v) => v.id === vid) : null);
  CATALOG.findByRole = (role) => CATALOG.products.find((p) => p.calculatorRole === role);
  CATALOG.inStock = (p) => p.variants.some((v) => v.inStock !== false);
  CATALOG.defaultVariant = (p) => p.variants.find((v) => v.isDefault && v.inStock !== false) || p.variants.find((v) => v.inStock !== false) || p.variants[0];

  // items: [{ pid, vid, qty }] → priced lines + totals. Unknown or out-of-stock items are dropped.
  CATALOG.computeTotals = function (items, couponCode, paymentMethod) {
    const s = CATALOG.store;
    const lines = [];
    (items || []).forEach((it) => {
      const p = CATALOG.findProduct(it.pid);
      const v = CATALOG.findVariant(p, it.vid);
      const qty = Math.max(1, Math.min(50, parseInt(it.qty, 10) || 1));
      if (p && v && v.inStock !== false) lines.push({ pid: p.id, vid: v.id, sku: v.sku || '', name: p.name, variant: v.label, unit: v.price, qty, total: r2(v.price * qty) });
    });
    const subtotal = r2(lines.reduce((a, l) => a + l.total, 0));
    const code = (couponCode || '').trim().toUpperCase();
    const c = CATALOG.coupons[code];
    let discount = 0;
    if (c && subtotal > 0) discount = c.percent ? r2(subtotal * c.percent / 100) : Math.min(c.flat || 0, subtotal);
    const afterDiscount = r2(subtotal - discount);
    const shipping = lines.length && !(s.freeShippingAbove === 0 || afterDiscount >= s.freeShippingAbove) ? s.shippingFee : 0;
    const cod = paymentMethod === 'cod' && lines.length ? s.codFee : 0;
    return { lines, subtotal, coupon: c ? code : null, couponLabel: c ? c.label : null, discount, shipping, codFee: cod, total: r2(afterDiscount + shipping + cod) };
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = CATALOG;
  else root.CATALOG = CATALOG;
})(typeof window !== 'undefined' ? window : globalThis);
