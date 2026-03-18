import "./globals.css";

export const metadata = {
  title: "PackOut AI",
  description: "Mobile-first field estimator for restoration pack-outs.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
