/**
 * TEMPORARY: Password Gate
 * Remove this entire file when Manus OAuth redirect domain is whitelisted for Cloudflare Pages.
 *
 * This component gates the entire app behind a simple password screen.
 * The password is verified server-side via the gate.verify tRPC procedure.
 * A signed JWT token is stored in localStorage to persist the session.
 */

import { useState, useEffect, type ReactNode } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Droplets, Lock, Loader2, AlertCircle } from "lucide-react";

const GATE_TOKEN_KEY = "olfactra_gate_token";

export function useGateToken() {
  return localStorage.getItem(GATE_TOKEN_KEY);
}

export function clearGateToken() {
  localStorage.removeItem(GATE_TOKEN_KEY);
}

interface PasswordGateProps {
  children: ReactNode;
}

export default function PasswordGate({ children }: PasswordGateProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [hasToken, setHasToken] = useState(() => Boolean(localStorage.getItem(GATE_TOKEN_KEY)));

  // Check if the gate is enabled on the server
  const gateCheck = trpc.gate.check.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  const verifyMutation = trpc.gate.verify.useMutation({
    onSuccess: (data) => {
      if (data.success && "token" in data) {
        localStorage.setItem(GATE_TOKEN_KEY, data.token);
        setHasToken(true);
        setError("");
      } else if (!data.success && "error" in data) {
        setError(data.error);
      }
    },
    onError: (err) => {
      setError(err.message || "Verification failed");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!password.trim()) {
      setError("Please enter a password");
      return;
    }
    verifyMutation.mutate({ password: password.trim() });
  };

  // If gate is not enabled, render children directly
  if (gateCheck.data && !gateCheck.data.enabled) {
    return <>{children}</>;
  }

  // Still loading gate check
  if (gateCheck.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  // Gate is enabled and user has a token — render the app
  if (hasToken) {
    return <>{children}</>;
  }

  // Gate is enabled and no token — show password screen
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-sm mx-4 shadow-lg border-border/50">
        <CardHeader className="text-center pb-4">
          <div className="flex flex-col items-center gap-4 mb-2">
            <div className="size-14 rounded-2xl bg-primary/15 flex items-center justify-center ring-1 ring-primary/20">
              <Droplets className="size-7 text-primary" />
            </div>
            <CardTitle className="text-xl font-serif font-bold tracking-tight">
              Olfactra
            </CardTitle>
          </div>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Lock className="size-3.5" />
            <span>Enter password to access the studio</span>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
              }}
              autoFocus
              className="h-11"
            />
            {error && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="size-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            <Button
              type="submit"
              size="lg"
              disabled={verifyMutation.isPending}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {verifyMutation.isPending ? (
                <Loader2 className="size-4 animate-spin mr-2" />
              ) : null}
              {verifyMutation.isPending ? "Verifying..." : "Enter Studio"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
