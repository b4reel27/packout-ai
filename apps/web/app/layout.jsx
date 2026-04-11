import "./globals.css";

export const metadata = {
  title: "PackOut AI",
  description: "Mobile-first field estimator for restoration pack-outs.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#102a43",
  colorScheme: "light",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" style={{ colorScheme: "light" }}>
      <body>{children}</body>
    </html>
  );
}
