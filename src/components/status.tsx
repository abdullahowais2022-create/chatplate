import { Badge } from "@/components/ui/badge";
import { STATUS_LABEL } from "@/lib/constants";

const VARIANT: Record<string, "info" | "violet" | "warning" | "success" | "brand" | "secondary" | "danger"> = {
  NEW: "info",
  CONFIRMED: "violet",
  PREPARING: "warning",
  READY: "success",
  OUT_FOR_DELIVERY: "brand",
  COMPLETED: "secondary",
  CANCELLED: "danger",
};

export function OrderStatusBadge({ status }: { status: string }) {
  return <Badge variant={VARIANT[status] ?? "secondary"}>{STATUS_LABEL[status] ?? status}</Badge>;
}
