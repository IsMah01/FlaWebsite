import {
  Briefcase,
  Crown,
  School,
  Truck,
  Users2,
  type LucideIcon,
} from "lucide-react";

export type ActivitySlug =
  | "future-leaders-academy"
  | "ambassadors-forum"
  | "trustees-program"
  | "dignity-caravan"
  | "careers-caravan";

export type ActivityFeedback = {
  name: string;
  role: string;
  comment: string;
  image: string;
};

export type ActivityBoardMember = {
  name?: string;
  role: string;
  image: string;
};

export type AmbassadorUpdate = {
  title: string;
  body: string;
  date: string;
};

export type AmbassadorActivityContent = {
  intro: string;
  updates: AmbassadorUpdate[];
};

export type ActivityData = {
  slug: ActivitySlug;
  icon: LucideIcon;
  title: string;
  description: string;
  color: string;
  intro: string;
  coverImage?: string;
  coverImageBackground?: "light" | "dark" | "soft";
  coverImageFit?: "cover" | "contain";
  gallery?: string[];
  videos?: string[];
  videoUrl?: string;
  board?: ActivityBoardMember[];
  highlightsTitle?: string;
  highlights?: string[];
  feedback?: ActivityFeedback[];
  ambassadorContent?: AmbassadorActivityContent;
};

function mediaPath(slug: ActivitySlug, file: string) {
  return `/activity-media/${slug}/${file}`;
}

function mediaImages(slug: ActivitySlug, count: number) {
  return Array.from({ length: count }, (_, index) => mediaPath(slug, `${String(index + 1).padStart(2, "0")}.jpg`));
}

export const activities: ActivityData[] = [
  {
    slug: "future-leaders-academy",
    icon: School,
    title: "أكاديمية أطر الغد",
    description:
      "مبادرة فكرية وتربوية تسعى إلى تجاوز النمط الأكاديمي التقليدي، عبر فتح آفاق أوسع أمام طلبة المعاهد والمدارس العليا، وتنمية وعيهم بقضايا الوطن والأمة، مع تعزيز قدراتهم الفكرية والقيادية.",
    color: "#4A9B8E",
    intro:
      "تضم الأكاديمية ندوات فكرية وثقافية، ومحاضرات ولقاءات تكوينية، ومسابقات مهارية وإبداعية، وبرامج للتطوير الذاتي وصناعة القيادات الشابة. الأكاديمية ليست مجرد برنامج تكويني، بل تجربة متكاملة تُعاش بكل تفاصيلها؛ عشرة أيام من التعلّم، والإبداع، والعمل الجماعي، وابتكار مشاريع تحمل أثراً حقيقياً ومستداماً.",
    coverImage: mediaPath("future-leaders-academy", "logo-visible.png"),
    coverImageBackground: "soft",
    coverImageFit: "contain",
    videoUrl: "https://www.youtube.com/embed/oYjeMZ8Cd7Q",
    board: [
      { name: "ندى وارث", role: "مديرة الدورة", image: mediaPath("future-leaders-academy", "pilotage-02.png") },
      { name: "الإدريسي محمد", role: "مسؤول الإيواء و التغذية", image: mediaPath("future-leaders-academy", "pilotage-03.jpg") },
      { name: "البراهمي يوسف", role: "مسؤول المالية", image: mediaPath("future-leaders-academy", "pilotage-04.jpg") },
      { name: "خديجة زغران", role: "مسؤولة التواصل", image: mediaPath("future-leaders-academy", "pilotage-08.jpeg") },
      { name: "ستيتلة ياسين", role: "مسؤول البرنامج", image: mediaPath("future-leaders-academy", "pilotage-05.jpg") },
      { name: "المتوكل خديجة", role: "مسؤولة المتابعة", image: mediaPath("future-leaders-academy", "pilotage-06.jpg") },
      { name: "حجي صلاح الدين", role: "مسؤول الضيوف و البروتوكول", image: mediaPath("future-leaders-academy", "pilotage-07.jpeg") },
      { name: "الزاير أكرم", role: "مسؤول الإعلام", image: mediaPath("future-leaders-academy", "pilotage-01.png") },
    ],
    highlights: [
      "ندوات فكرية وثقافية.",
      "محاضرات ولقاءات تكوينية.",
      "مسابقات مهارية وإبداعية.",
      "برامج للتطوير الذاتي وصناعة القيادات الشابة.",
    ],
    feedback: [
      {
        name: "سفيان محسن",
        role: "سفير الدورة 15",
        comment:
          "سوية مثل فضاء للأكاديمية أو لكل مشارك، في الأكاديمية. لقد ربطتني بها ذكريات ومعانٍ كثيرة، وساعدتني على تطوير شخصيتي وتوسيع مداركي. تعلمت أن الحياة أوسع من حدود التخصص، وأن خدمة المجتمع تبدأ من الوعي والمسؤولية.",
        image: "/images/logo.png",
      },
      {
        name: "SARA SADIK",
        role: "2nd Year Pharmacy Student at FMPM | 15th edition ambassador",
        comment:
          "As the days passed and the challenges multiplied, my love and attachment to this academy deepened. The supervisors and participants created a harmonious, educational, respectful, and unparalleled environment, where we led each other, united in the hope of guiding our nation toward success and prosperity. Though we were divided by our academic disciplines, we were bound together by a shared purpose; this was the true beauty of the program.",
        image: "/images/logo.png",
      },
      {
        name: "زكرياء الميموني",
        role: "طالب بشعبة الهندسة بمدرسة الحكامة وعلوم الاقتصاد الاجتماعي والتضامني بسلا",
        comment:
          "تنتمي لأكاديمية و يبقى حنينك لأيامها أعمق من حماسك قبل بدئها. ساعاتها تدارب معنى اللحظات التي عشتها، بمحاضريها وضيوفها. تتذكر ورش الصباحيات حيث أخذ الحوار من التحدي قواعد. ذكريات نقاشات وحوارات هادفة تختصرها، ومناظرات في رحاب محاضرات تستنهض الفكر، وتوسع مداركك، فتخرج من براثن الجهل وحيل التلقين إلى أنوار التعلم والرسالية.",
        image: "/images/logo.png",
      },
    ],
  },
  {
    slug: "ambassadors-forum",
    icon: Users2,
    title: "ملتقى السفراء",
    description:
      "فضاء تفاعلي يجمع سفراء الأكاديمية لتوحيد الرؤية، وترسيخ روح الانتماء المؤسسي، وتعزيز تبادل الخبرات والتجارب، في بيئة تُشجع على المبادرة والابتكار والعمل المشترك.",
    color: "#5FB3A3",
    intro:
      "ويشكل الملتقى محطة نوعية لصناعة شبكة شبابية واعية ومؤثرة، تؤمن بقيمة التعاون، وتسعى إلى تحويل الأفكار إلى مبادرات ومشاريع ذات أثر مجتمعي ملموس.",
    coverImage: mediaPath("ambassadors-forum", "logo.png"),
    coverImageBackground: "dark",
    coverImageFit: "contain",
    videos: [mediaPath("ambassadors-forum", "23.mp4")],
    highlightsTitle: "أبرز اللحظات",
    highlights: [
      "جلسات تقييم وتخطيط بين السفراء.",
      "ورشات لصناعة المبادرات المشتركة.",
      "نقاشات حول أثر الخريجين داخل المجتمع والمؤسسات.",
    ],
    ambassadorContent: {
      intro:
        "هذه المساحة الإضافية مخصصة للسفراء فقط، وتضم المستجدات المرتبطة بملتقى السفراء، وخلاصات التنسيق، والمحطات القادمة الخاصة بالخريجين.",
      updates: [
        {
          title: "خلاصة ملتقى 02 و03 ماي 2026",
          body:
            "تم الاتفاق على تقوية التنسيق بين السفراء حسب الجهات، مع إعداد لائحة مبادرات محلية قابلة للتنفيذ خلال الفترة المقبلة.",
          date: "03/05/2026",
        },
        {
          title: "إطلاق متابعة ما بعد الملتقى",
          body:
            "جرى تكليف فرق صغيرة لمتابعة توصيات الملتقى، خصوصا ما يتعلق بالتواصل الداخلي وتبادل الخبرات بين الأفواج السابقة.",
          date: "06/05/2026",
        },
        {
          title: "تحضير محطة السفراء المقبلة",
          body:
            "سيتم تخصيص لقاء تنسيقي رقمي لتحديد الأولويات العملية قبل الإعلان عن المحطة القادمة الخاصة بالسفراء.",
          date: "12/05/2026",
        },
      ],
    },
  },
  {
    slug: "trustees-program",
    icon: Crown,
    title: "برنامج أمناء",
    description:
      "برنامج قيادي وتأهيلي مستمر موجه لخريجي أكاديمية أطر الغد، يمتد على مدار السنة، ويهدف إلى إعداد قيادات تجمع بين العمق الفكري، والنضج التربوي، والكفاءة العملية.",
    color: "#3D7A6F",
    intro:
      "برنامج قيادي وتأهيلي مستمر موجه لخريجي أكاديمية أطر الغد، يمتد على مدار السنة، ويهدف إلى إعداد قيادات تجمع بين العمق الفكري، والنضج التربوي، والكفاءة العملية.",
    coverImage: mediaPath("trustees-program", "logo.png"),
    coverImageBackground: "light",
    coverImageFit: "contain",
    videos: [mediaPath("trustees-program", "intro.mp4")],
    highlights: [
      "مواكبة سنوية للسفراء والخريجين.",
      "مسارات تطوير شخصية ومهنية متقدمة.",
      "لقاءات دورية مع مؤطرين وخبراء.",
    ],
    ambassadorContent: {
      intro:
        "هذه النسخة التفصيلية من برنامج أمناء متاحة للسفراء، وتعرض مستجدات البرنامج، محطات المتابعة، وأولويات العمل خلال الموسم الجاري.",
      updates: [
        {
          title: "لقاء المواكبة الأول",
          body:
            "خصصت المحطة الأولى لتقييم أثر ما بعد الأكاديمية، وضبط حاجيات السفراء في مجالات التأطير والتطوير الشخصي والمهني.",
          date: "18/04/2026",
        },
        {
          title: "مسار التأهيل القيادي",
          body:
            "تمت برمجة جلسات دورية مركزة حول القيادة، بناء المبادرات، وإدارة المسؤوليات داخل الفرق والمشاريع المجتمعية.",
          date: "01/05/2026",
        },
        {
          title: "متابعة المشاريع الفردية",
          body:
            "سيتم خلال المرحلة المقبلة تخصيص حيز أكبر لتتبع مشاريع السفراء ومرافقتهم في تحويل الأفكار إلى مبادرات قابلة للتنفيذ.",
          date: "14/05/2026",
        },
      ],
    },
  },
  {
    slug: "dignity-caravan",
    icon: Truck,
    title: "قافلة الكرامة",
    description:
      "مبادرة إنسانية وتنموية جابت عدداً من الدواوير والمناطق القروية، بهدف ترسيخ قيم التضامن والتكافل الاجتماعي، ومد جسور الدعم والتواصل مع الفئات المحتاجة.",
    color: "#6BC4B2",
    intro:
      "مبادرة إنسانية وتنموية جابت عدداً من الدواوير والمناطق القروية، بهدف ترسيخ قيم التضامن والتكافل الاجتماعي، ومد جسور الدعم والتواصل مع الفئات المحتاجة.",
    coverImage: mediaPath("dignity-caravan", "cover.jpg"),
    videos: [mediaPath("dignity-caravan", "11.mp4"), mediaPath("dignity-caravan", "12.mp4")],
    highlights: [
      "تدخلات ميدانية بالمناطق القروية.",
      "مبادرات تضامنية ذات أثر مباشر.",
      "انخراط السفراء في خدمة المجتمع.",
    ],
  },
  {
    slug: "careers-caravan",
    icon: Briefcase,
    title: "قافلة المهن",
    description:
      "قافلة توجيه ميدانية يشرف عليها سفراء الأكاديمية من الطلبة والخريجين، وتهدف إلى تقريب التوجيه الأكاديمي والمهني من التلاميذ في المناطق البعيدة، وجعل المعلومة متاحة للجميع.",
    color: "#2D5F56",
    intro:
      "قافلة توجيه ميدانية يشرف عليها سفراء الأكاديمية من الطلبة والخريجين، وتهدف إلى تقريب التوجيه الأكاديمي والمهني من التلاميذ في المناطق البعيدة، وجعل المعلومة متاحة للجميع.",
    highlights: [
      "لقاءات توجيهية داخل المؤسسات التعليمية.",
      "تقريب المعلومة المهنية من التلاميذ.",
      "استثمار خبرات السفراء في المصاحبة والتوجيه.",
    ],
  },
];

export function getActivityBySlug(slug?: string) {
  return activities.find((activity) => activity.slug === slug);
}
