import "./globals.css";

export const metadata = {
  title: 'Калькулятор БМ',
  description: 'Калькулятор себестоимости модульных зданий',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru">
      <body className="bg-slate-50 text-slate-900 antialiased">{children}</body>
    </html>
  )
}
