import { Suspense } from "react";
import LoginClient from "@/components/pages/login-client";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginClient />
    </Suspense>
  );
}
