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
                className="group flex flex-col md:flex-row gap-6 bg-[#F8FAF9] rounded-2xl p-6 border border-gray-100 hover:border-[#4A9B8E]/20 hover:bg-[#F3F8F6] transition-colors"
              >
                <div
                  className="p-4 rounded-xl h-fit w-fit"
                  style={{ backgroundColor: `${activity.color}15` }}
                >
                  <activity.icon className="w-8 h-8" style={{ color: activity.color }} />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{activity.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{activity.description}</p>
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
