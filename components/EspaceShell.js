"use client";

import { createContext, useContext, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

const CLE = "theme-espace";
const FONDS = { clair: "#f3f5f1", sombre: "#121a16" };

const ThemeContext = createContext({ preference: "auto", changer: () => {} });

export function useTheme() {
  return useContext(ThemeContext);
}

function resoudre(pref) {
  if (pref === "clair" || pref === "sombre") return pref;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "sombre"
    : "clair";
}

export default function EspaceShell({ children }) {
  const router = useRouter();
  const chemin = usePathname();
  const [preference, setPreference] = useState("auto");
  const [theme, setTheme] = useState("clair");
  const [pret, setPret] = useState(false);

  // Au chargement : lire le choix mémorisé et vérifier la connexion
  useEffect(() => {
    let pref = "auto";
    try {
      const v = localStorage.getItem(CLE);
      if (v === "clair" || v === "sombre" || v === "auto") pref = v;
    } catch {}
    setPreference(pref);
    setTheme(resoudre(pref));

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.replace("/connexion");
      else setPret(true);
    });
  }, [router]);

  // Mode automatique : suivre le réglage du téléphone
  useEffect(() => {
    if (preference !== "auto") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const maj = () => setTheme(mq.matches ? "sombre" : "clair");
    mq.addEventListener("change", maj);
    return () => mq.removeEventListener("change", maj);
  }, [preference]);

  // Colorer aussi le fond derrière la page (défilement, bords)
  useEffect(() => {
    document.body.style.backgroundColor = FONDS[theme];
    return () => {
      document.body.style.backgroundColor = "";
    };
  }, [theme]);

  function changer(pref) {
    setPreference(pref);
    setTheme(resoudre(pref));
    try {
      localStorage.setItem(CLE, pref);
    } catch {}
  }

  const courant = (debut) => (chemin && chemin.startsWith(debut) ? "page" : undefined);
  const accueil = chemin === "/tableau-de-bord" ? "page" : undefined;

  const icone = (children) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
      strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );

  return (
    <ThemeContext.Provider value={{ preference, changer }}>
      <div className="espace" data-theme={theme}>
        {pret ? (
          <>
            {children}
            <nav className="barre" aria-label="Navigation principale">
              <Link href="/tableau-de-bord" aria-current={accueil}>
                {icone(<>
                  <path d="M3 11l9-8 9 8" />
                  <path d="M5 10v10h5v-6h4v6h5V10" />
                </>)}
                Accueil
              </Link>
              <Link href="/devis" aria-current={courant("/devis")}>
                {icone(<>
                  <path d="M6 3h9l4 4v14H6z" />
                  <path d="M14 3v5h5" />
                  <path d="M9 13h7" />
                  <path d="M9 17h7" />
                </>)}
                Devis
              </Link>
              <Link href="/clients" aria-current={courant("/clients")}>
                {icone(<>
                  <circle cx="9" cy="8" r="3.2" />
                  <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
                  <circle cx="17" cy="9" r="2.5" />
                  <path d="M17 14c2.5 0 4.5 2 4.5 4.5" />
                </>)}
                Clients
              </Link>
              <Link href="/catalogue" aria-current={courant("/catalogue")}>
                {icone(<>
                  <path d="M3 7.5L12 3l9 4.5v9L12 21l-9-4.5z" />
                  <path d="M3 7.5L12 12l9-4.5" />
                  <path d="M12 12v9" />
                </>)}
                Catalogue
              </Link>
              <Link href="/parametres" aria-current={courant("/parametres")}>
                {icone(<>
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5h0a1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
                </>)}
                Paramètres
              </Link>
            </nav>
          </>
        ) : (
          <main className="page"><p>Chargement…</p></main>
        )}
      </div>
    </ThemeContext.Provider>
  );
    }
