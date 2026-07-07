"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/api";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    async function checkAuth() {
      try {
        // Check if setup is required FIRST
        const { setupRequired } = await auth.checkSetup();
        if (setupRequired) {
          router.replace("/setup");
          return;
        }

        // Only check auth if setup is complete
        try {
          await auth.me();
          router.replace("/dashboard");
        } catch {
          router.replace("/signin");
        }
      } catch (error) {
        // If API is down or setup check fails, 
        // try to go to setup (it will handle its own errors)
        router.replace("/setup");
      }
    }

    checkAuth();
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
    </div>
  );
}