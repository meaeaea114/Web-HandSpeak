"use client";

import { useState } from "react";
import Link from "next/link";
import { resetPassword, formatAuthError } from "@/lib/auth-service";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  GraduationCap,
  Mail,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!email) {
      setError("Please enter your email address");
      setLoading(false);
      return;
    }

    try {
      await resetPassword(email);
      setSubmitted(true);
    } catch (err: any) {
      setError(formatAuthError(err.code || ""));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-[#2A3B5C]/15 shadow-xl bg-white/95 backdrop-blur-sm">
      <CardHeader className="space-y-1 text-center pb-4">
        <div className="lg:hidden mx-auto w-12 h-12 rounded-xl bg-gradient-to-br from-[#2A3B5C] to-[#1E2A42] flex items-center justify-center shadow-md mb-2">
          <GraduationCap className="w-6 h-6 text-[#FFD700]" />
        </div>
        <CardTitle className="text-2xl font-bold text-[#2A3B5C] tracking-tight">
          Reset Password
        </CardTitle>
        <CardDescription className="text-sm text-slate-600">
          Enter your institutional email to receive a password reset link
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {submitted ? (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-2 text-sm text-center">
            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <h4 className="font-semibold text-emerald-950">Reset link sent!</h4>
            <p className="text-xs text-emerald-800 leading-relaxed">
              We&apos;ve sent a password reset link to <strong>{email}</strong>. Check your inbox and spam folder.
            </p>
          </div>
        ) : (
          <>
            {error && (
              <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-rose-800 text-sm animate-shake">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@handspeak.edu"
                    disabled={loading}
                    className="w-full pl-9 pr-3 py-2.5 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#2A3B5C]/30 focus:border-[#2A3B5C] transition-all disabled:opacity-50"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-[#2A3B5C] hover:bg-[#1E2A42] text-white py-2.5 font-medium shadow-md hover:shadow-lg transition-all"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Sending link...
                  </span>
                ) : (
                  "Send Reset Link"
                )}
              </Button>
            </form>
          </>
        )}
      </CardContent>

      <CardFooter className="flex justify-center pt-0 border-t border-slate-100 mt-2">
        <Link
          href="/auth/login"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2A3B5C] hover:text-[#FFD700] pt-3 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to login
        </Link>
      </CardFooter>
    </Card>
  );
}