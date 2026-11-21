import type { Metadata } from "next";
import { AccountView } from "./account-view";

export const metadata: Metadata = { title: "Moje konto (eZUS — symulacja)" };

export default function KontoPage() {
  return <AccountView />;
}
