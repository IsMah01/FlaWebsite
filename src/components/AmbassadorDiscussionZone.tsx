import { useState } from "react";
import { MessageSquareText, SendHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/providers/trpc";

export default function AmbassadorDiscussionZone({ author }: { author: string }) {
  const [message, setMessage] = useState("");
  const utils = trpc.useUtils();

  const messagesQuery = trpc.ambassador.listMessages.useQuery();
  const postMutation = trpc.ambassador.postMessage.useMutation({
    onSuccess: async () => {
      setMessage("");
      await utils.ambassador.listMessages.invalidate();
      toast.success("تم نشر الرسالة بنجاح");
    },
    onError: (error) => {
      toast.error(error.message || "تعذر نشر الرسالة");
    },
  });

  const submit = () => {
    const trimmed = message.trim();
    if (!trimmed) return;
    postMutation.mutate({ message: trimmed });
  };

  return (
    <section className="py-12 bg-[#F8FAF9]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="rounded-[32px] border border-[#4A9B8E]/15 bg-white p-6 md:p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#4A9B8E]/10">
              <MessageSquareText className="w-6 h-6 text-[#4A9B8E]" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">فضاء السفراء للنقاش</h2>
              <p className="text-sm text-gray-500">حوارٌ يُثري، وفكرٌ يَبني. شارك السفراء فكرتك!</p>
            </div>
          </div>

          <div className="grid lg:grid-cols-[0.95fr_1.05fr] gap-6">
            <div className="rounded-3xl bg-[#F5FBF8] border border-[#4A9B8E]/10 p-5">
              <div className="text-sm text-gray-500 mb-3">تكتب باسم: <span className="font-semibold text-gray-900">{author}</span></div>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="اكتب فكرة، إعلانا، ملاحظة تنظيمية أو رسالة لباقي السفراء..."
                className="min-h-36 resize-none border-[#4A9B8E]/15 bg-white"
              />
              <Button
                onClick={submit}
                disabled={postMutation.isPending}
                className="mt-4 bg-[#4A9B8E] hover:bg-[#3D7A6F]"
              >
                نشر الرسالة
                <SendHorizontal className="w-4 h-4 mr-2" />
              </Button>
            </div>

            <div className="space-y-4">
              {messagesQuery.isLoading ? (
                <div className="rounded-3xl border border-dashed border-[#4A9B8E]/20 p-6 text-center text-gray-500">
                  جاري تحميل الرسائل...
                </div>
              ) : messagesQuery.data && messagesQuery.data.length > 0 ? (
                messagesQuery.data.map((entry) => (
                  <article key={entry.id} className="rounded-3xl border border-gray-100 bg-[#FCFDFC] p-5">
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div>
                        <h3 className="font-bold text-gray-900">{entry.authorName}</h3>
                        <p className="text-xs text-[#4A9B8E]">
                          {entry.authorType === "admin" ? "إدارة" : "سفير"}
                        </p>
                      </div>
                      <time className="text-xs text-gray-400">
                        {new Date(entry.createdAt).toLocaleString()}
                      </time>
                    </div>
                    <p className="text-gray-600 leading-8 whitespace-pre-wrap">{entry.message}</p>
                  </article>
                ))
              ) : (
                <div className="rounded-3xl border border-dashed border-[#4A9B8E]/20 p-6 text-center text-gray-500">
                  لا توجد رسائل بعد. ابدأ أول نقاش بين السفراء.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
