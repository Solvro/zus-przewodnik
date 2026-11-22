import type { Metadata } from "next";
import { AdminView } from "./admin-view";

export const metadata: Metadata = { title: "Panel administracyjny", robots: { index: false } };

export default function AdminPage() {
  return <AdminView />;
}
