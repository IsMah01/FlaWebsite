import { useNavigate } from "react-router";
import { motion } from "framer-motion";
import { ArrowLeft, Calendar, Image as ImageIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/providers/trpc";

type EditionsGridProps = {
  title?: string;
  badge?: string;
  description?: string;
  editionNumbers?: number[];
  className?: string;
};

export default function EditionsGrid({
  title = "الدورات السابقة للأكاديمية",
  badge = "الدورات السابقة",
  description = "استعرض الدورات السابقة لأكاديمية أطر الغد منذ البداية، واكتشف أبرز المحطات والأنشطة والصور.",
  editionNumbers,
  className = "",
}: EditionsGridProps) {
  const navigate = useNavigate();
  const { data: editions, isLoading } = trpc.editions.list.useQuery();
  const visibleEditions = editionNumbers
    ? editions
        ?.filter((edition) => editionNumbers.includes(edition.editionNumber))
        .sort((a, b) => editionNumbers.indexOf(a.editionNumber) - editionNumbers.indexOf(b.editionNumber))
    : editions;

  return (
    <section className={className}>
      <div className="text-center mb-12">
        <span className="inline-block px-4 py-1 bg-[#4A9B8E]/10 text-[#4A9B8E] rounded-full text-sm font-medium mb-4">
          {badge}
        </span>
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900">{title}</h2>
        {description ? (
          <p className="text-gray-600 mt-3 max-w-2xl mx-auto leading-relaxed">{description}</p>
        ) : null}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {visibleEditions?.map((edition, index) => (
            <motion.button
              key={edition.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-30px" }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
              onClick={() => navigate(`/edition/${edition.editionNumber}`)}
              className="group relative bg-white rounded-2xl overflow-hidden border border-gray-100 hover:border-[#4A9B8E]/30 transition-all card-hover text-right"
            >
              <div className="h-32 bg-gradient-to-br from-[#4A9B8E] to-[#6BC4B2] flex items-center justify-center">
                {edition.coverImage ? (
                  <img
                    src={edition.coverImage}
                    alt={edition.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <ImageIcon className="w-10 h-10 text-white/50" />
                )}
              </div>
              <div className="p-4">
                <div className="flex items-center gap-1 text-xs text-[#4A9B8E] mb-2">
                  <Calendar className="w-3 h-3" />
                  <span>{edition.dateRange || "غير محدد"}</span>
                </div>
                <h3 className="font-bold text-gray-900 text-sm mb-1 group-hover:text-[#4A9B8E] transition-colors">
                  {edition.title}
                </h3>
                <p className="text-xs text-gray-500 line-clamp-2">{edition.description}</p>
                <div className="mt-3 flex items-center text-xs text-[#4A9B8E] font-medium">
                  <span>عرض التفاصيل</span>
                  <ArrowLeft className="w-3 h-3 mr-1 group-hover:-translate-x-1 transition-transform" />
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      )}
    </section>
  );
}
