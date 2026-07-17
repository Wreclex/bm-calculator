import Script from "next/script";
import { Inter } from "next/font/google";
import "./globals.css";

// Inter с кириллицей; next/font сам хостит файлы — внешних запросов с клиента нет.
const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter",
  display: "swap",
});

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
    <html lang="ru" className={inter.variable}>
      <body className="bg-cream text-cocoa antialiased">
        {/* Инициализация темы ДО первой отрисовки — без вспышки чужой палитры. */}
        <Script id="theme-init" strategy="beforeInteractive">
          {`try{var t=localStorage.getItem('bm-theme');if(t==='business'||t==='dark'){document.documentElement.dataset.theme=t;}}catch(e){}`}
        </Script>
        {children}
        {/* ИИ-чат-помощник: плавающая кнопка + окно чата, vanilla JS из public/.
            lazyOnload — рекомендация доков Next 16 для чат-виджетов. */}
        <Script src="/ai-chat-widget.js" strategy="lazyOnload" />
      </body>
    </html>
  )
}
