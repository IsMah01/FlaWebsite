export type NewsItem = {
  id: string;
  title: string;
  category: string;
  date: string;
  excerpt: string;
  content: string;
};

export type EventItem = {
  id: string;
  title: string;
  date: string;
  location: string;
  summary: string;
  cta?: string;
};

export const newsItems: NewsItem[] = [];

export const upcomingEvents: EventItem[] = [
  {
    id: "careers-caravan-larache",
    title: "قافلة المهن",
    date: "2026-05-13",
    location: "العرائش",
    summary:
      "من واقع تجربتهم وإيمانهم بـشرف الرسالة، سفراؤنا شاركوا خبراتهم الأكاديمية والمهنية مع طلبة العرائش، ليكونوا البوصلة التي تقودهم نحو التميّز",
  },
  {
    id: "academy-deadline",
    title: "إغلاق استمارة الترشح لأكاديمية أطر الغد",
    date: "2026-05-28",
    location: "عن بعد",
    summary:
      "لا تفوت الفرصة، املأ الاستمارة وانضم إلينا في تجربة تعاش ولا تحكى",
    cta: "املأ الاستمارة",
  },
];

export const pastEvents: EventItem[] = [
  {
    id: "ambassadors-forum-2026",
    title: "ملتقى السفراء",
    date: "2026-05-02",
    location: "مركب بسمة",
    summary:
      "نلتقي لنرتقي، بمركب بسمة ملتقى السفراء جمعنا مجدداً يومي 02 و03 ماي 2026، لنحتفي بإنجازاتنا ونخطط لمبادراتنا القادمة",
  },
];
