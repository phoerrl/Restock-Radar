import type { BranchStock } from "./retail.ts";

export function hasBranchStock(branch: BranchStock) {
  return branch.status === "available" && (branch.quantity === null ||
    (Number.isInteger(branch.quantity) && branch.quantity > 0));
}
