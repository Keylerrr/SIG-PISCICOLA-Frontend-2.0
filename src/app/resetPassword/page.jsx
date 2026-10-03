import { Suspense } from "react";
import ResetPasswordContent from "./resetPasswordContent";

export default function ResetPassword() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}