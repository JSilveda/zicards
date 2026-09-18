"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ClientOnly } from "@/components/client-only";
import { LoadingPage } from "@/components/ui/loading";
import type { Session } from "@supabase/supabase-js";

function AuthGuardInner({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    import("@/lib/supabase/client").then(({ createClient }) => {
      const supabase = createClient();
      supabase.auth.getUser().then(({ data: userData }: { data: { user: { id: string } | null } }) => {
        if (!userData.user) {
          router.push("/login");
        }
        setLoading(false);
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (_event: string, session: Session | null) => {
          if (!session?.user) {
            router.push("/login");
          }
          setLoading(false);
        }
      );

      return () => subscription.unsubscribe();
    });
  }, [router]);

  if (loading) return <LoadingPage />;

  return <>{children}</>;
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  return (
    <ClientOnly>
      <AuthGuardInner>{children}</AuthGuardInner>
    </ClientOnly>
  );
}
