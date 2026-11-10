import { Order, OrderItem, Product } from '../types';

/**
 * Calculates initial parcel specifications for an order based on the products'
 * admin-only packaging dimensions.
 *
 * Rules:
 * - Single item: Uses product's packed_length_cm, packed_width_cm, packed_height_cm, packed_weight_kg.
 * - Multiple items / quantities:
 *   - Weight is cumulative (sum of all item weights based on quantity).
 *   - Dimensions do NOT simply multiply L × W × H.
 *   - Garments fold and stack: parcel Length and Width match the standard garment fold footprint,
 *     while parcel Height scales incrementally with additional units.
 */
export function calculateOrderParcel(
  items: OrderItem[],
  products: Product[]
): {
  final_package_weight: number; // in kg
  final_package_length: number; // in cm
  final_package_width: number;  // in cm
  final_package_height: number; // in cm
} {
  const productMap = new Map<string, Product>();
  products.forEach((p) => productMap.set(p.id, p));

  let totalWeightKg = 0;
  let maxPackedLength = 30; // standard default apparel fold length (cm)
  let maxPackedWidth = 24;  // standard default apparel fold width (cm)
  let baseHeight = 4;       // base height for single garment (cm)
  let totalUnits = 0;

  items.forEach((item) => {
    const prod = productMap.get(item.productId);
    const qty = Math.max(1, item.quantity || 1);
    totalUnits += qty;

    const pWeight = prod?.packed_weight_kg ?? prod?.product_weight_kg ?? 0.35;
    totalWeightKg += pWeight * qty;

    const pLen = prod?.packed_length_cm ?? prod?.product_length_cm ?? 30;
    const pWid = prod?.packed_width_cm ?? prod?.product_width_cm ?? 24;
    const pHgt = prod?.packed_height_cm ?? prod?.product_height_cm ?? 4;

    if (pLen > maxPackedLength) maxPackedLength = pLen;
    if (pWid > maxPackedWidth) maxPackedWidth = pWid;
    if (pHgt > baseHeight) baseHeight = pHgt;
  });

  // Calculate final parcel height based on stacking (approx +2.5cm per extra garment)
  const additionalUnits = Math.max(0, totalUnits - 1);
  const finalHeight = Math.min(25, baseHeight + additionalUnits * 2.5);

  return {
    final_package_weight: Number(Math.max(0.1, totalWeightKg).toFixed(2)),
    final_package_length: Math.round(maxPackedLength),
    final_package_width: Math.round(maxPackedWidth),
    final_package_height: Math.round(finalHeight),
  };
}

/**
 * Sanitizes an order object for customer-facing views.
 * STRIPS all admin-only dimensions, weights, courier calculation details, and internal IDs.
 * Customers only see normal tracking information (Status, Courier Name, AWB number, Milestones).
 */
export function sanitizeOrderForCustomer(order: Order): Order {
  const sanitized: Order = {
    id: order.id,
    customer: {
      name: order.customer.name,
      mobile: order.customer.mobile,
      email: order.customer.email,
      house: order.customer.house,
      street: order.customer.street,
      city: order.customer.city,
      state: order.customer.state,
      pincode: order.customer.pincode,
      landmark: order.customer.landmark,
    },
    items: order.items.map((it) => ({
      productId: it.productId,
      name: it.name,
      image: it.image,
      size: it.size,
      color: it.color,
      quantity: it.quantity,
      price: it.price,
    })),
    subtotal: order.subtotal,
    discount: order.discount,
    gst: order.gst,
    deliveryCharge: order.deliveryCharge,
    total: order.total,
    paymentMode: order.paymentMode,
    paymentStatus: order.paymentStatus,
    orderStatus: order.orderStatus,
    createdAt: order.createdAt,
  };

  // Safe tracking info for customer (no internal courier IDs, no internal Shipmozo IDs)
  if (order.shipmozo) {
    sanitized.shipmozo = {
      courier: order.shipmozo.courier,
      awb: order.shipmozo.awb,
      status: order.shipmozo.status,
      labelGenerated: Boolean(order.shipmozo.labelGenerated),
      shippedAt: order.shipmozo.shippedAt,
      estimatedDelivery: order.shipmozo.estimatedDelivery,
      history: order.shipmozo.history || [],
    };
  }

  // Explicitly ensure NO admin-only fields are attached
  delete sanitized.final_package_weight;
  delete sanitized.final_package_length;
  delete sanitized.final_package_width;
  delete sanitized.final_package_height;
  delete sanitized.estimated_shipping_cost;
  delete sanitized.selected_courier_id;
  delete sanitized.selected_courier_name;
  delete sanitized.shipmozo_order_id;

  return sanitized;
}

/**
 * Sanitizes a product object for customer-facing views.
 * STRIPS all admin-only product/packaging dimensions and weights.
 */
export function sanitizeProductForCustomer(product: Product): Product {
  const copy = { ...product };
  delete copy.product_length_cm;
  delete copy.product_width_cm;
  delete copy.product_height_cm;
  delete copy.product_weight_kg;
  delete copy.packed_length_cm;
  delete copy.packed_width_cm;
  delete copy.packed_height_cm;
  delete copy.packed_weight_kg;
  return copy;
}
