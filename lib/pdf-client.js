import { supabase } from "./supabase";

// Demande le PDF d'un devis au serveur et le retourne sous forme de fichier (Blob)
export async function recupererPdf(devisId) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Session expirée. Reconnectez-vous.");

  const reponse = await fetch(`/api/devis/${devisId}/pdf`, {
    headers: { Authorization: `Bearer ${session.access_token}` },
  });

  if (!reponse.ok) {
    let texte = "Génération du PDF impossible.";
    try {
      const j = await reponse.json();
      if (j.erreur) texte = j.erreur;
    } catch {}
    throw new Error(texte);
  }
  return await reponse.blob();
}
