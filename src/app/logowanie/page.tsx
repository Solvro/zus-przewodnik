import type { Metadata } from "next";
import { LoginFlow } from "./login-flow";

export const metadata: Metadata = { title: "Logowanie (symulacja mObywatel)" };

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <LoginFlow />
    </div>
  );
}
