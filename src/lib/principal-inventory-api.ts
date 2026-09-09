// Principal Inventory module -- GET /inventory-items, /inventory-items/overview,
// /inventory-categories already grant PRINCIPAL the identical class-level
// access as VICE_PRINCIPAL (confirmed by direct backend audit:
// inventory-items/inventory-categories.controller.ts, every write method has
// its own narrower @Roles('ADMIN') override, unaffected by either read grant).
// Re-exporting the already-correct VP module rather than duplicating it.

export {
  getInventoryOverview,
  listInventoryItems,
  getInventoryItem,
  listInventoryCategories,
  type InventoryOverview,
  type InventoryItemRow,
  type InventoryItemListParams,
  type InventoryItemDetail,
  type InventoryCategory,
} from './vice-principal-inventory-api';
