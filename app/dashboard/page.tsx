"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export default function DashboardPage() {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    console.log("[v0] Dashboard: loading=", loading, "user=", user, "isAuthenticated=", isAuthenticated);
    
    // Only proceed when loading is complete
    if (loading) {
      console.log("[v0] Dashboard: Still loading, waiting...");
      return;
    }

    // Check if user is authenticated
    if (!isAuthenticated || !user) {
      // If no user session exists, send them back to login
      console.log("[v0] Dashboard: No user, redirecting to login");
      router.push("/auth/login");
      return;
    }

    // Dynamic redirection based on user roles
    console.log("[v0] Dashboard: Redirecting based on role:", user.role);
    switch (user.role?.toLowerCase()) {
      case "admin":
        router.push("/dashboard/admin");
        break;
      case "teacher":
      case "faculty":
        router.push("/dashboard/teacher");
        break;
      default:
        // Fallback if it's a student/user or route doesn't exist yet
        router.push("/"); 
        break;
    }
  }, [user, loading, isAuthenticated, router]);

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
