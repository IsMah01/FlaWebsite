import { Link } from "react-router";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { activities } from "@/data/activities";

export default function ActivitiesSection() {
  return (
    <section id="activities" className="py-20 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <span className="inline-block px-4 py-1 bg-[#4A9B8E]/10 text-[#4A9B8E] rounded-full text-sm font-medium mb-4">
            أنشطتنا
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">أنشطة المؤسسة</h2>
        </motion.div>

        <div className="space-y-6">
          {activities.map((activity, index) => (
            <motion.div
              key={activity.slug}
              initial={{ opacity: 0, x: index % 2 === 0 ? -30 : 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Link
                to={`/activities/${activity.slug}`}
                className="group flex h-full min-h-[26rem] flex-col overflow-hidden rounded-2xl border border-gray-100 bg-[#F8FAF9] transition-colors hover:border-[#4A9B8E]/20 hover:bg-[#F3F8F6] sm:min-h-[23rem] md:h-72 md:min-h-0 md:flex-row"
              >
                {activity.coverImage ? (
                  <div
                    className={`h-56 shrink-0 overflow-hidden sm:h-60 md:h-full md:w-72 ${
                      activity.coverImageBackground === "dark"
                        ? "bg-[#1f5148]"
                        : activity.coverImageBackground === "light"
                          ? "bg-white"
                          : activity.coverImageBackground === "soft"
                            ? "bg-[#EAF7F3]"
                            : "bg-gray-100"
                    }`}
                  >
                    <img
                      src={activity.coverImage}
                      alt={activity.title}
                      loading="lazy"
                      className={
                        activity.coverImageFit === "contain"
                          ? "h-full w-full object-contain p-5 transition-transform duration-300 group-hover:scale-105"
                          : "h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      }
                    />
                  </div>
                ) : null}
                <div className="flex flex-1 flex-col justify-center p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{activity.title}</h3>
                  <p className="text-gray-600 leading-relaxed line-clamp-4">{activity.description}</p>
                  <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#4A9B8E]">
                    <span>اكتشف تفاصيل النشاط</span>
                    <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
