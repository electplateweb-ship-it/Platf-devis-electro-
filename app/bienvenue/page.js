"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function Bienvenue() {
  const router = useRouter();
  const [etablissement, setEtablissement] = useState(null);
  const [erreur, setErreur] = useState("");
  const [copie, setCopie] = useState(false);

  useEffect(() => {
    async function charger() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace("/connexion");
        return;
      }
      const user = session.user;

      let { data: etab } = await supabase
        .from("establishments")
        .select("*")
        .eq("owner_id", user.id)
        .maybeSingle();

      // Création de l'établissement avec les infos de l'inscription
      if (!etab) {
        const meta = user.user_metadata || {};
        const { data: cree, error } = await supabase
          .from("establishments")
          .insert({
            owner_id: user.id,
            name: meta.etablissement || "Mon établissement",
            manager_name: meta.responsable || null,
            phone: meta.telephone || null,
            email: user.email,
          })
          .select()
          .single();
        if (error) {
          setErreur(error.message);
          return;
        }
        etab = cree;
      }
      setEtablissement(etab);
    }
    charger();
  }, [router]);

  async function copierAdresse(adresse) {
    try {
      await navigator.clipboard.writeText(adresse);
      setCopie(true);
      setTimeout(() => setCopie(false), 2000);
    } catch {
      setCopie(false);
    }
  }

  if (erreur) {
    return (
      <main className="page">
        <div className="message erreur">{erreur}</div>
      </main>
    );
  }

  if (!etablissement) {
    return <main className="page"><p>Création de votre espace…</p></main>;
  }

  const adresse = `${window.location.origin}/espace/${etablissement.slug}`;

  return (
    <main className="page">
      <span className="marque">Devis Électricien</span>
      <h1>Votre espace est prêt</h1>
      <p className="sous-titre">
        Bienvenue, {etablissement.name}. Voici votre adresse personnelle
        permanente : gardez-la dans vos favoris.
      </p>

      <div className="carte">
        <div className="adresse">{adresse}</div>

        <button className="bouton secondaire" onClick={() => copierAdresse(adresse)}>
          {copie ? "Adresse copiée" : "Copier mon adresse"}
        </button>

        <Link href="/tableau-de-bord" className="bouton">
          Accéder à mon espace
        </Link>
      </div>
    </main>
  );
  }
