import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export const LANGUAGES = [
  { id: "en", label: "English", dir: "ltr" },
  { id: "fa", label: "فارسی", dir: "rtl" },
  { id: "ar", label: "العربية", dir: "rtl" },
  { id: "es", label: "Español", dir: "ltr" },
  { id: "fr", label: "Français", dir: "ltr" },
  { id: "zh", label: "中文", dir: "ltr" },
  { id: "hi", label: "हिन्दी", dir: "ltr" },
] as const;
export type Lang = (typeof LANGUAGES)[number]["id"];

type Dict = Record<string, string>;
// Keys are the English text; missing keys fall back to English.
const T: Record<Exclude<Lang, "en">, Dict> = {
  fa: {
    Network: "شبکه", "Buy side": "خریدار", Creative: "خلاقیت", "Sell side": "فروشنده", Measurement: "سنجش",
    "Global Network": "شبکه جهانی", Marketplace: "بازار", Billboards: "بیلبوردها", Cities: "شهرها", "Video Guide": "راهنمای ویدیویی",
    Bookings: "رزروها", "RFP Marketplace": "بازار درخواست پیشنهاد", "Smart Contracts": "قراردادهای هوشمند", Campaigns: "کمپین‌ها",
    "OOH Services": "خدمات تبلیغات محیطی", "Live & Sponsorship": "زنده و حمایت مالی", "Design Studio": "استودیو طراحی", "AI Creative": "خلاقیت هوش مصنوعی",
    "AI Optimizer": "بهینه‌ساز هوش مصنوعی", "Partner Console": "کنسول شریک", "Displayer Console": "کنسول نمایشگر", "Pi Payouts": "پرداخت‌های پای",
    "Delivery & Impressions": "تحویل و بازدید", Analytics: "تحلیل‌ها", "On-chain Ledger": "دفتر کل زنجیره‌ای", "Innovation Bot": "ربات نوآوری",
    Language: "زبان", Sponsorships: "حمایت‌های مالی", "Transit & street": "حمل‌ونقل و خیابان", "Live auctions": "مزایده‌های زنده",
    Submit: "ثبت", "Place bid": "ثبت پیشنهاد", "Create auction": "ایجاد مزایده", "Sign in with Pi": "ورود با پای", Estimate: "برآورد",
    "Your requests": "درخواست‌های شما", "Open auctions": "مزایده‌های باز", "Sponsorships, transit & live auctions": "حمایت مالی، حمل‌ونقل و مزایده زنده",
  },
  ar: {
    Network: "الشبكة", "Buy side": "المشتري", Creative: "الإبداع", "Sell side": "البائع", Measurement: "القياس",
    "Global Network": "الشبكة العالمية", Marketplace: "السوق", Billboards: "اللوحات", Cities: "المدن", "Video Guide": "دليل الفيديو",
    Bookings: "الحجوزات", "RFP Marketplace": "سوق طلبات العروض", "Smart Contracts": "العقود الذكية", Campaigns: "الحملات",
    "OOH Services": "خدمات الإعلان الخارجي", "Live & Sponsorship": "البث والرعاية", "Design Studio": "استوديو التصميم", "AI Creative": "إبداع الذكاء الاصطناعي",
    "AI Optimizer": "محسّن الذكاء الاصطناعي", "Partner Console": "لوحة الشريك", "Displayer Console": "لوحة العارض", "Pi Payouts": "مدفوعات باي",
    "Delivery & Impressions": "التسليم والمشاهدات", Analytics: "التحليلات", "On-chain Ledger": "السجل على السلسلة", "Innovation Bot": "روبوت الابتكار",
    Language: "اللغة", Sponsorships: "الرعايات", "Transit & street": "النقل والشارع", "Live auctions": "مزادات مباشرة",
    Submit: "إرسال", "Place bid": "قدّم عرضًا", "Create auction": "إنشاء مزاد", "Sign in with Pi": "تسجيل الدخول بـ Pi", Estimate: "تقدير",
    "Your requests": "طلباتك", "Open auctions": "المزادات المفتوحة", "Sponsorships, transit & live auctions": "الرعاية والنقل والمزادات المباشرة",
  },
  es: {
    Network: "Red", "Buy side": "Compra", Creative: "Creativo", "Sell side": "Venta", Measurement: "Medición",
    "Global Network": "Red global", Marketplace: "Mercado", Billboards: "Vallas", Cities: "Ciudades", "Video Guide": "Guía en video",
    Bookings: "Reservas", "RFP Marketplace": "Mercado de RFP", "Smart Contracts": "Contratos inteligentes", Campaigns: "Campañas",
    "OOH Services": "Servicios exteriores", "Live & Sponsorship": "En vivo y patrocinio", "Design Studio": "Estudio de diseño", "AI Creative": "Creativo IA",
    "AI Optimizer": "Optimizador IA", "Partner Console": "Consola de socio", "Displayer Console": "Consola de pantallas", "Pi Payouts": "Pagos Pi",
    "Delivery & Impressions": "Entrega e impresiones", Analytics: "Analítica", "On-chain Ledger": "Registro en cadena", "Innovation Bot": "Bot de innovación",
    Language: "Idioma", Sponsorships: "Patrocinios", "Transit & street": "Transporte y calle", "Live auctions": "Subastas en vivo",
    Submit: "Enviar", "Place bid": "Pujar", "Create auction": "Crear subasta", "Sign in with Pi": "Entrar con Pi", Estimate: "Estimación",
    "Your requests": "Tus solicitudes", "Open auctions": "Subastas abiertas", "Sponsorships, transit & live auctions": "Patrocinios, transporte y subastas en vivo",
  },
  fr: {
    Network: "Réseau", "Buy side": "Achat", Creative: "Création", "Sell side": "Vente", Measurement: "Mesure",
    "Global Network": "Réseau mondial", Marketplace: "Place de marché", Billboards: "Panneaux", Cities: "Villes", "Video Guide": "Guide vidéo",
    Bookings: "Réservations", "RFP Marketplace": "Appels d'offres", "Smart Contracts": "Contrats intelligents", Campaigns: "Campagnes",
    "OOH Services": "Services d'affichage", "Live & Sponsorship": "Direct et parrainage", "Design Studio": "Studio de design", "AI Creative": "Création IA",
    "AI Optimizer": "Optimiseur IA", "Partner Console": "Console partenaire", "Displayer Console": "Console écrans", "Pi Payouts": "Paiements Pi",
    "Delivery & Impressions": "Diffusion et impressions", Analytics: "Analyses", "On-chain Ledger": "Registre on-chain", "Innovation Bot": "Bot d'innovation",
    Language: "Langue", Sponsorships: "Parrainages", "Transit & street": "Transport et rue", "Live auctions": "Enchères en direct",
    Submit: "Envoyer", "Place bid": "Enchérir", "Create auction": "Créer une enchère", "Sign in with Pi": "Se connecter avec Pi", Estimate: "Estimation",
    "Your requests": "Vos demandes", "Open auctions": "Enchères ouvertes", "Sponsorships, transit & live auctions": "Parrainages, transport et enchères en direct",
  },
  zh: {
    Network: "网络", "Buy side": "买方", Creative: "创意", "Sell side": "卖方", Measurement: "测量",
    "Global Network": "全球网络", Marketplace: "市场", Billboards: "广告牌", Cities: "城市", "Video Guide": "视频指南",
    Bookings: "预订", "RFP Marketplace": "招标市场", "Smart Contracts": "智能合约", Campaigns: "广告活动",
    "OOH Services": "户外广告服务", "Live & Sponsorship": "直播与赞助", "Design Studio": "设计工作室", "AI Creative": "AI 创意",
    "AI Optimizer": "AI 优化器", "Partner Console": "合作伙伴控制台", "Displayer Console": "屏幕控制台", "Pi Payouts": "Pi 付款",
    "Delivery & Impressions": "投放与曝光", Analytics: "分析", "On-chain Ledger": "链上账本", "Innovation Bot": "创新机器人",
    Language: "语言", Sponsorships: "赞助", "Transit & street": "交通与街道", "Live auctions": "实时竞拍",
    Submit: "提交", "Place bid": "出价", "Create auction": "创建竞拍", "Sign in with Pi": "使用 Pi 登录", Estimate: "估算",
    "Your requests": "您的请求", "Open auctions": "进行中的竞拍", "Sponsorships, transit & live auctions": "赞助、交通与实时竞拍",
  },
  hi: {
    Network: "नेटवर्क", "Buy side": "खरीद", Creative: "क्रिएटिव", "Sell side": "बिक्री", Measurement: "मापन",
    "Global Network": "वैश्विक नेटवर्क", Marketplace: "बाज़ार", Billboards: "बिलबोर्ड", Cities: "शहर", "Video Guide": "वीडियो गाइड",
    Bookings: "बुकिंग", "RFP Marketplace": "RFP बाज़ार", "Smart Contracts": "स्मार्ट कॉन्ट्रैक्ट", Campaigns: "अभियान",
    "OOH Services": "आउटडोर सेवाएँ", "Live & Sponsorship": "लाइव और प्रायोजन", "Design Studio": "डिज़ाइन स्टूडियो", "AI Creative": "AI क्रिएटिव",
    "AI Optimizer": "AI ऑप्टिमाइज़र", "Partner Console": "पार्टनर कंसोल", "Displayer Console": "डिस्प्ले कंसोल", "Pi Payouts": "Pi भुगतान",
    "Delivery & Impressions": "डिलीवरी और इम्प्रेशन", Analytics: "विश्लेषण", "On-chain Ledger": "ऑन-चेन लेजर", "Innovation Bot": "इनोवेशन बॉट",
    Language: "भाषा", Sponsorships: "प्रायोजन", "Transit & street": "परिवहन और सड़क", "Live auctions": "लाइव नीलामी",
    Submit: "जमा करें", "Place bid": "बोली लगाएँ", "Create auction": "नीलामी बनाएँ", "Sign in with Pi": "Pi से साइन इन", Estimate: "अनुमान",
    "Your requests": "आपके अनुरोध", "Open auctions": "खुली नीलामियाँ", "Sponsorships, transit & live auctions": "प्रायोजन, परिवहन और लाइव नीलामी",
  },
};

const Ctx = createContext<{ lang: Lang; setLang: (l: Lang) => void; t: (s: string) => string }>({
  lang: "en",
  setLang: () => {},
  t: (s) => s,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");
  useEffect(() => {
    const saved = localStorage.getItem("pb_lang") as Lang | null;
    if (saved && LANGUAGES.some((l) => l.id === saved)) setLangState(saved);
  }, []);
  useEffect(() => {
    const def = LANGUAGES.find((l) => l.id === lang)!;
    document.documentElement.lang = lang;
    document.documentElement.dir = def.dir;
  }, [lang]);
  const setLang = (l: Lang) => {
    localStorage.setItem("pb_lang", l);
    setLangState(l);
  };
  const t = (s: string) => (lang === "en" ? s : T[lang][s] ?? s);
  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>;
}

export const useI18n = () => useContext(Ctx);

export function LanguageSwitcher() {
  const { lang, setLang, t } = useI18n();
  return (
    <select
      aria-label={t("Language")}
      value={lang}
      onChange={(e) => setLang(e.target.value as Lang)}
      className="h-8 rounded-md border border-border bg-surface px-2 text-xs text-foreground"
    >
      {LANGUAGES.map((l) => (
        <option key={l.id} value={l.id}>{l.label}</option>
      ))}
    </select>
  );
}
