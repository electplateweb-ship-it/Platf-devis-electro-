"use client";

import { useParams } from "next/navigation";
import EspaceShell from "../../../components/EspaceShell";
import EditeurDevis from "../../../components/EditeurDevis";

export default function ModifierDevis() {
  const { id } = useParams();
  return (
    <EspaceShell>
      <EditeurDevis devisId={id} />
    </EspaceShell>
  );
}
