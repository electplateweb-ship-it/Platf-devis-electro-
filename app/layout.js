import "./globals.css";

export const metadata = {
  title: "Devis Électricien",
  description: "Créez et gérez vos devis d'électricité en PDF.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>{children}</body>
    </html>
  );
    }
