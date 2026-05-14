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
      "محطة ميدانية للتوجيه الأكاديمي والمهني بمدينة العرائش، بمشاركة سفراء المؤسسة لتقريب المعلومة من التلاميذ والطلبة.",
  },
  {
    id: "academy-deadline",
    title: "إغلاق استمارة الترشح لأكاديمية أطر الغد",
    date: "2026-05-28",
    location: "عن بعد",
    summary:
      "آخر أجل للتسجيل في الدورة المقبلة من الأكاديمية. هذا الموعد يمثل المحطة الأهم لكل الراغبين في الانضمام.",
    cta: "سجل الآن",
  },
];

export const pastEvents: EventItem[] = [
  {
    id: "ambassadors-forum-2026",
    title: "ملتقى السفراء",
    date: "2026-05-02",
    location: "مركب بسمة",
    summary:
      "انعقد ملتقى السفراء يومي 02 و03 ماي 2026 بمركب بسمة، وشكل محطة جامعة لتبادل التجارب بين السفراء وتعزيز الانتماء المؤسسي وتنسيق مبادرات المرحلة المقبلة.",
  },
];
