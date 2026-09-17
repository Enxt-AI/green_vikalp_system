"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";

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
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-neutral-50 p-6">
      <Skeleton className="h-12 w-12 rounded-2xl" />
      <Skeleton className="h-5 w-48" />
      <Skeleton className="h-4 w-32" />
    </div>
  );
}