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

const yesNoOptions = ["نعم", "لا"];

const candidateQuestionnaireFields: CandidateQuestionField[] = [
  { key: "first_name", label: "الاسم الشخصي", kind: "text" },
  { key: "last_name", label: "الاسم العائلي", kind: "text" },
  { key: "sex", label: "الجنس", kind: "select", options: ["ذكر", "أنثى"] },
  { key: "birthday", label: "تاريخ الازدياد", kind: "date" },
  { key: "nationality", label: "الجنسية", kind: "text" },
  { key: "city_of_study_or_work", label: "مدينة الدراسة أو العمل", kind: "text" },
  { key: "birthplace", label: "المدينة الأصلية", kind: "text" },
  { key: "phone_number", label: "رقم الهاتف", kind: "tel" },
  { key: "whatsapp_number", label: "رقم الواتساب", kind: "tel" },
  { key: "linkedin_link", label: "رابط صفحتك الخاصة على لينكدين", kind: "url" },
  { key: "facebook_link", label: "رابط صفحتك الخاصة على الفايسبوك", kind: "url" },
  { key: "instagram_link", label: "رابط صفحتك الخاصة على الإنستغرام", kind: "url" },
  { key: "other_platform_link", label: "منصة أخرى", kind: "url" },
  { key: "institute", label: "معهد أو المؤسسة الذي تدرس أو درست فيه", kind: "text" },
  { key: "specialty", label: "التخصص", kind: "text" },
  { key: "academic_year_or_graduation", label: "السنة الدراسية أو سنة التخرج", kind: "text" },
  {
    key: "health_condition",
    label: "هل تعاني من أي مرض أو حالة صحية خاصة، مثل الحساسية أو السكري أو غيرهما؟",
    kind: "textarea",
  },
  {
    key: "member_of_association",
    label: "هل أنت عضو في مؤسسة أو جمعية أو نادي؟",
    kind: "select",
    options: yesNoOptions,
  },
  {
    key: "association_details_or_reason",
    label: "إذا كان الجواب نعم، اذكر اسم الجمعية أو المؤسسة أو النادي. وإذا كان الجواب لا، ما السبب؟",
    kind: "textarea",
  },
  {
    key: "association_role_and_gain",
    label: "ما مهمتك داخل الجمعية أو المؤسسة أو النادي؟ وماذا استفدت من هذه التجربة؟",
    kind: "textarea",
  },
  {
    key: "proud_accomplishments",
    label: "اذكر أهم الإنجازات التي تفتخر بها، مثل الفوز بمسابقة أو تكوين أو مشروع.",
    kind: "textarea",
  },
  {
    key: "participated_in_project",
    label: "هل سبق لك المشاركة في إعداد أو تنزيل مشروع ربحي أو خيري؟",
    kind: "select",
    options: yesNoOptions,
  },
  {
    key: "project_details_and_contribution",
    label: "إذا كان الجواب نعم، اذكر المشروع ومساهمتك فيه.",
    kind: "textarea",
  },
  {
    key: "leadership_concept",
    label: "ما هو تصورك للقيادة بالنسبة لك؟",
    kind: "textarea",
  },
  {
    key: "strongest_skills",
    label: "ما هي المهارات التي تتميز بها؟",
    kind: "textarea",
  },
  {
    key: "skills_to_develop",
    label: "ما هي المهارات التي تريد تطويرها؟",
    kind: "textarea",
  },
  {
    key: "practical_skills_domains",
    label:
      "هل لديك مهارات في أحد المجالات التالية: التصميم، التصوير، صناعة المحتوى، التحدث أمام الجمهور، التنظيم، إدارة المشاريع؟",
    kind: "textarea",
  },
  { key: "languages", label: "ما اللغات التي تتحدثها؟", kind: "text" },
  {
    key: "role_model",
    label: "من هو أو هي قدوتك في الحياة؟",
    kind: "textarea",
  },
  {
    key: "interests",
    label: "ما هي مجالات اهتمامك؟",
    kind: "textarea",
  },
  {
    key: "defended_social_causes",
    label: "ما هي القضايا المجتمعية التي تدافع عنها؟ وكيف تدافع عنها؟",
    kind: "textarea",
  },
  {
    key: "life_goals",
    label: "ما هي أهدافك في الحياة؟",
    kind: "textarea",
  },
  {
    key: "core_value",
    label: "ما القيمة أو المبدأ الذي تعتبره أساسيا في حياتك؟",
    kind: "textarea",
  },
  {
    key: "knowledge_sources",
    label:
      "ما هي الوسائل التي تلجأ إليها لاكتساب وتحصيل المعرفة، مثل الكتب أو المقالات أو الوثائقيات أو البودكاست أو وسائل التواصل الاجتماعي؟",
    kind: "textarea",
  },
  {
    key: "most_influential_knowledge_material",
    label: "ما هي الفكرة العامة لأكثر مادة معرفية أثرت فيك؟",
    kind: "textarea",
  },
  {
    key: "academy_knowledge",
    label: "كيف تعرفت على الأكاديمية؟ وماذا تعرف عنها؟",
    kind: "textarea",
  },
  {
    key: "participated_in_academy_again",
    label: "هل سبق لك المشاركة في الأكاديمية؟ إذا كان الجواب نعم، لماذا تريد إعادة المشاركة؟",
    kind: "textarea",
  },
  {
    key: "similar_youth_or_training_activities",
    label: "هل سبق لك المشاركة في أنشطة شبابية أو تكوينية مماثلة؟ إذا كان الجواب نعم، ما هي؟",
    kind: "textarea",
  },
  {
    key: "best_candidate_and_academy_goals",
    label: "ما الذي يميزك ويجعل منك المشارك الأنسب؟ وما هي أهدافك من الأكاديمية؟",
    kind: "textarea",
  },
  {
    key: "full_commitment",
    label:
      "هل أنت مستعد للالتزام ببرنامج الأكاديمية كاملا؟ وهل لديك التزامات أو تواريخ غير مؤكدة قد تعيق حضورك خلال الأكاديمية؟",
    kind: "textarea",
  },
  {
    key: "withdrawal_experience",
    label: "هل سبق أن انسحبت من مشروع أو نشاط؟ ولماذا؟",
    kind: "textarea",
  },
  {
    key: "proposed_academy_segment",
    label: "اقترح فقرة شبابية يمكن تنظيمها داخل الأكاديمية مع شرح هدفها.",
    kind: "textarea",
  },
  {
    key: "future_project_idea",
    label: "ما المشروع أو الفكرة التي تتمنى تنفيذها يوما ما؟",
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
    title: "المعلومات الشخصية",
    description: "المعطيات الأساسية للتواصل والتعريف بالمسار الدراسي والصحي للمترشح.",
    fields: fields([
      "first_name",
      "last_name",
      "sex",
      "birthday",
      "nationality",
      "city_of_study_or_work",
      "birthplace",
      "phone_number",
      "whatsapp_number",
      "linkedin_link",
      "facebook_link",
      "instagram_link",
      "other_platform_link",
      "institute",
      "specialty",
      "academic_year_or_graduation",
      "health_condition",
    ]),
  },
  {
    id: "experiences",
    title: "الخبرات والتجارب السابقة",
    description: "التجارب الجمعوية والمشاريع والإنجازات التي تكشف مسار المترشح وخبرته العملية.",
    fields: fields([
      "member_of_association",
      "association_details_or_reason",
      "association_role_and_gain",
      "proud_accomplishments",
      "participated_in_project",
      "project_details_and_contribution",
    ]),
  },
  {
    id: "skills",
    title: "المهارات والقدرات",
    description: "تصور المترشح للقيادة ومهاراته الحالية والمهارات التي يريد تطويرها.",
    fields: fields([
      "leadership_concept",
      "strongest_skills",
      "skills_to_develop",
      "practical_skills_domains",
      "languages",
    ]),
  },
  {
    id: "vision",
    title: "التفكير والرؤية",
    description: "القدوة، الاهتمامات، القضايا، الأهداف، والقيم التي توجه تفكير المترشح.",
    fields: fields([
      "role_model",
      "interests",
      "defended_social_causes",
      "life_goals",
      "core_value",
      "knowledge_sources",
      "most_influential_knowledge_material",
    ]),
  },
  {
    id: "motivation",
    title: "الدافع والرغبة في المشاركة",
    description: "علاقة المترشح بالأكاديمية ودوافعه وأهدافه من المشاركة.",
    fields: fields([
      "academy_knowledge",
      "participated_in_academy_again",
      "similar_youth_or_training_activities",
      "best_candidate_and_academy_goals",
    ]),
  },
  {
    id: "commitment",
    title: "الالتزام والانضباط",
    description: "مدى استعداد المترشح للالتزام الكامل وحسن تدبير المسؤولية.",
    fields: fields([
      "full_commitment",
      "withdrawal_experience",
    ]),
  },
  {
    id: "closing",
    title: "أسئلة ختامية",
    description: "اقتراحات ومشاريع مستقبلية تكشف روح المبادرة لدى المترشح.",
    fields: fields([
      "proposed_academy_segment",
      "future_project_idea",
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
