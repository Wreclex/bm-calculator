import Script from "next/script";
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
      <body className="bg-slate-50 text-slate-900 antialiased">
        {children}
        {/* ИИ-чат-помощник: плавающая кнопка + окно чата, vanilla JS из public/.
            lazyOnload — рекомендация доков Next 16 для чат-виджетов. */}
        <Script src="/ai-chat-widget.js" strategy="lazyOnload" />
      </body>
    </html>
  )
}
