"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";


export default function DashboardPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
  console.log("Dashboard:", {
    user,
    isLoading,
  });

  if (!isLoading) {
    if (!user) {
      console.log("No user -> redirect login");
      router.push("/auth/login");
      return;
    }

    console.log("User role:", user.role);

    switch (user.role.toLowerCase()) {
      case "admin":
        router.push("/dashboard/admin");
        break;

      case "teacher":
      case "faculty":
        router.push("/dashboard/teacher");
        break;

      default:
        router.push("/");
    }
  }
}, [user, isLoading, router]);

  // Loading state placeholder while evaluating roles
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-2">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        <p className="text-sm text-muted-foreground">Redirecting to your dashboard...</p>
      </div>
    </div>
  );
}