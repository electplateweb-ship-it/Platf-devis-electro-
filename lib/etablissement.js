import { supabase } from "./supabase";

// Retourne l'établissement de l'utilisateur connecté (ou null)
export async function obtenirEtablissement() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  const { data } = await supabase
    .from("establishments")
    .select("*")
    .eq("owner_id", session.user.id)
    .maybeSingle();
  return data || null;
}

// Pour la recherche : minuscules et sans accents
export function normaliser(texte) {
  return (texte || "")
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}
