import type { Metadata } from "next";
import { PlanView } from "./plan-view";

export const metadata: Metadata = { title: "Mój plan rodzicielski" };

export default function PlanPage() {
  return <PlanView />;
}
