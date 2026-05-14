export type CandidateQuestionField = {
  key: string;
  label: string;
  kind: "text" | "textarea" | "date" | "tel" | "url" | "select";
  options?: string[];
};

export type CandidateQuestionnaireStep = {
  id: string;
  title: string;
  description: string;
  fields: CandidateQuestionField[];
};

const candidateQuestionnaireFields: CandidateQuestionField[] = [
  { key: "last_name", label: "Last name / الاسم العائلي", kind: "text" },
  { key: "first_name", label: "First name / الاسم الشخصي", kind: "text" },
  { key: "sex", label: "Sex / الجنس", kind: "select", options: ["Male", "Female"] },
  { key: "birthday", label: "Birthday / تاريخ الازدياد", kind: "date" },
  { key: "nationality", label: "Nationality / الجنسية", kind: "text" },
  { key: "birthplace", label: "Birthplace / المدينة الأصلية", kind: "text" },
  {
    key: "are_you",
    label: "Are you? / هل أنت؟",
    kind: "text",
  },
  {
    key: "institute",
    label:
      "معهد أو المؤسسة الذي تدرس أو درست فيه\nThe institute you are studying at / have studied at",
    kind: "text",
  },
  { key: "specialty", label: "التخصص / Specialty", kind: "text" },
  {
    key: "academic_level",
    label:
      "المستوى الدراسي للسنة المقبلة / سنة التخرج إذا كنت خريجا\nAcademic level for the year 2024-2025 or the graduation year if you are a graduate",
    kind: "text",
  },
  {
    key: "city_of_study_or_work",
    label: "City of study or work / مدينة الدراسة أو العمل",
    kind: "text",
  },
  {
    key: "languages",
    label: "The languages that you speak / اللغات التي تتحدث بها",
    kind: "text",
  },
  { key: "phone_number", label: "Phone number / رقم الهاتف", kind: "tel" },
  { key: "whatsapp_number", label: "WhatsApp number / رقم الواتساب", kind: "tel" },
  {
    key: "facebook_link",
    label: "Your Facebook profile link / رابط صفحتك الخاصة على الفايسبوك",
    kind: "url",
  },
  {
    key: "linkedin_link",
    label: "Your LinkedIn profile link / رابط صفحتك الخاصة على اللينكدإن",
    kind: "url",
  },
  {
    key: "instagram_link",
    label: "Your Instagram profile link / رابط صفحتك الخاصة على الإنستغرام",
    kind: "url",
  },
  {
    key: "other_platform_link",
    label: "Link of other platforms / منصة أخرى",
    kind: "url",
  },
  {
    key: "chronic_diseases",
    label:
      "هل تعاني من أية أمراض مزمنة، حساسية معينة؟ إذا كانت الإجابة بنعم، اذكرها\nDo you suffer from any chronic diseases or certain allergies? If the answer is yes, mention it please.",
    kind: "textarea",
  },
  {
    key: "member_of_association",
    label:
      "هل أنت عضو في مؤسسة أو جمعية أو نادٍ؟\nAre you a member of an association, institution or school club?",
    kind: "select",
    options: ["Yes", "No"],
  },
  {
    key: "association_name_or_reason",
    label:
      "إذا كان الجواب نعم، اذكر اسم الجمعية أو المؤسسة أو النادي، وإذا كان الجواب لا، ما السبب؟\nIf the answer is yes, mention the name of the association, institution or club. If the answer is no, what is the reason?",
    kind: "textarea",
  },
  {
    key: "mission_and_gain",
    label:
      "مهمتك داخل الجمعية أو المؤسسة أو النادي؟ ماذا استفدت من هذه التجربة؟\nYour mission within the association / institution / club, and what did you gain from this experience?",
    kind: "textarea",
  },
  {
    key: "participated_in_project",
    label:
      "هل سبق لك المشاركة في إعداد أو تنزيل مشروع (ربحي، خيري...)؟\nHave you ever participated in preparing or implementing a project?",
    kind: "select",
    options: ["Yes", "No"],
  },
  {
    key: "project_description",
    label:
      "إذا كان الجواب نعم، اذكر المشروع ومساهمتك فيه\nIf the answer is yes, mention the project and describe your contribution",
    kind: "textarea",
  },
  {
    key: "future_project_willingness_1",
    label:
      "هل لديك استعداد مستقبلا لخوض هذه التجربة (العمل على مشروع ما)؟ لماذا؟\nDo you have any willingness in the future to engage in this experience (working on a project)? Why?",
    kind: "textarea",
  },
  {
    key: "future_project_willingness_2",
    label:
      "هل لديك استعداد مستقبلا لخوض هذه التجربة؟ لماذا؟\nDo you have any willingness in the future to engage in this experience? Why?",
    kind: "textarea",
  },
  {
    key: "knowledge_means",
    label:
      "ما هي الوسائل التي تلجأ إليها لاكتساب وتحصيل المعرفة (...كتب، مقالات، وثائقيات)\nWhat are the means that you resort to acquire and collect knowledge (...books, articles, documentaries)?",
    kind: "textarea",
  },
  {
    key: "most_influential_material",
    label:
      "استنادا إلى الإجابة السابقة، اذكر الفكرة العامة لأكثر مادة معرفية (كتاب، وثائقي، مقال...) أثرت فيك\nBased on the previous question, what is the main idea of the knowledge material (book, article, documentary...) that influenced you the most?",
    kind: "textarea",
  },
  {
    key: "major_accomplishments",
    label:
      "اذكر أهم الإنجازات التي تفتخر بها (...فوز بمسابقة، تكوين)\nMention major accomplishments you are proud of (winning a competition, formation)",
    kind: "textarea",
  },
  {
    key: "interests",
    label: "ما هي مجالات اهتمامك؟\nWhat are your interests?",
    kind: "textarea",
  },
  {
    key: "talents",
    label: "ما هي الموهبة أو المواهب التي تميزك؟\nWhat are the talents that distinguish you?",
    kind: "textarea",
  },
  {
    key: "goals_in_life",
    label: "ما هي أهدافك في الحياة؟\nWhat are your goals in life?",
    kind: "textarea",
  },
  {
    key: "three_characters",
    label: "اذكر ثلاث صفات تميزك\nMention three characters that distinguish you",
    kind: "textarea",
  },
  {
    key: "teamwork_under_pressure",
    label:
      "كيف تصف اشتغالك وسط الفريق وكيف تتعامل تحت الضغط؟\nHow do you describe your work within a team and how do you deal under pressure?",
    kind: "textarea",
  },
  {
    key: "role_model",
    label:
      "من هو الشخص (أو الأشخاص) الذي تعتبره قدوة لك في الحياة؟\nWho do you consider as a role model in your life?",
    kind: "textarea",
  },
  {
    key: "participated_in_academy",
    label: "هل سبق لك المشاركة في الأكاديمية؟\nHave you ever participated in the academy?",
    kind: "select",
    options: ["Yes", "No"],
  },
  {
    key: "how_did_you_know_academy",
    label: "كيف تعرفت على الأكاديمية؟\nHow did you find out about the academy?",
    kind: "textarea",
  },
  {
    key: "motivation_to_participate",
    label:
      "ما هو الحافز الذي يدفعك للمشاركة في الأكاديمية؟\nWhat motivates you to participate in the academy?",
    kind: "textarea",
  },
  {
    key: "desired_activities_course_16",
    label:
      "ما هي الفقرات أو الأنشطة التي تتطلع لإيجادها في الدورة 16؟\nWhat paragraphs or activities are you looking forward to finding in Course 16?",
    kind: "textarea",
  },
];

const fieldMap = new Map(candidateQuestionnaireFields.map((field) => [field.key, field]));

function fields(keys: string[]) {
  return keys.map((key) => {
    const field = fieldMap.get(key);
    if (!field) {
      throw new Error(`Missing candidate questionnaire field: ${key}`);
    }
    return field;
  });
}

export const candidateQuestionnaireSteps: CandidateQuestionnaireStep[] = [
  {
    id: "personal-info",
    title: "المعطيات الشخصية",
    description: "الهوية الأساسية للمترشح والمعطيات المدنية الضرورية.",
    fields: fields([
      "last_name",
      "first_name",
      "sex",
      "birthday",
      "nationality",
      "birthplace",
    ]),
  },
  {
    id: "academic-path",
    title: "المسار الدراسي",
    description: "الوضع الدراسي أو المهني الحالي، المؤسسة، التخصص، واللغات.",
    fields: fields([
      "are_you",
      "institute",
      "specialty",
      "academic_level",
      "city_of_study_or_work",
      "languages",
    ]),
  },
  {
    id: "contact",
    title: "التواصل والمعطيات الصحية",
    description: "وسائل التواصل والمعطيات الصحية التي قد تهم التنظيم.",
    fields: fields([
      "phone_number",
      "whatsapp_number",
      "facebook_link",
      "linkedin_link",
      "instagram_link",
      "other_platform_link",
      "chronic_diseases",
    ]),
  },
  {
    id: "association",
    title: "الانخراط الجمعوي",
    description: "علاقة المترشح بالجمعيات والأندية وما اكتسبه من هذه التجارب.",
    fields: fields([
      "member_of_association",
      "association_name_or_reason",
      "mission_and_gain",
    ]),
  },
  {
    id: "projects",
    title: "التجارب والمشاريع",
    description: "المشاريع السابقة والاستعداد لخوض مبادرات مستقبلية.",
    fields: fields([
      "participated_in_project",
      "project_description",
      "future_project_willingness_1",
      "future_project_willingness_2",
    ]),
  },
  {
    id: "self-development",
    title: "التكوين الذاتي والاهتمامات",
    description: "مصادر التعلم، الإنجازات، الاهتمامات، والمواهب التي تميز المترشح.",
    fields: fields([
      "knowledge_means",
      "most_influential_material",
      "major_accomplishments",
      "interests",
      "talents",
    ]),
  },
  {
    id: "personality",
    title: "الشخصية والطموح",
    description: "الأهداف، الصفات الشخصية، العمل وسط الفريق، والقدوة.",
    fields: fields([
      "goals_in_life",
      "three_characters",
      "teamwork_under_pressure",
      "role_model",
    ]),
  },
  {
    id: "academy",
    title: "الدافع نحو الأكاديمية",
    description: "علاقة المترشح بالأكاديمية، دوافعه للمشاركة، وما ينتظره من الدورة.",
    fields: fields([
      "participated_in_academy",
      "how_did_you_know_academy",
      "motivation_to_participate",
      "desired_activities_course_16",
    ]),
  },
  {
    id: "review",
    title: "المراجعة النهائية",
    description: "مراجعة الأجوبة ثم تأكيدها قبل الإرسال النهائي.",
    fields: [],
  },
];

export { candidateQuestionnaireFields };
