"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export default function HomePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || isLoading) return;

    if (!user) {
      router.push("/login");
      return;
    }

    // Cast to string to safely evaluate custom runtime roles without narrowing conflicts
    const role = user.role as string;

    if (role === "admin") {
      router.push("/dashboard/admin");
    } else if (role === "teacher" || role === "faculty") {
      router.push("/dashboard/teacher");
    } else {
      router.push("/dashboard/student");
    }
  }, [user, isLoading, router, mounted]);

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-[#F5E6C4]">
      <div className="text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-600 border-t-transparent mx-auto" />
        <p className="mt-4 text-gray-700 font-medium">Redirecting...</p>
      </div>
    </div>
  );
}