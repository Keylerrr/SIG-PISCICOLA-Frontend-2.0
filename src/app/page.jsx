"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Page() {
  const router = useRouter();
  useEffect(() => {
    const token = localStorage.getItem("access");

    if (token) {
      router.push("/home");
    }
    else {
      router.push("/login");
    }
  }, [router]);

  return null;
}