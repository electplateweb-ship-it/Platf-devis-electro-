"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

export default function OuvrirEspace() {
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      router.replace(session ? "/tableau-de-bord" : "/connexion");
    });
  }, [router]);

  return (
    <main className="page">
      <p>Ouverture de votre espace…</p>
    </main>
  );
}
