import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router";
import { motion } from "framer-motion";
import { CheckCircle, XCircle, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/providers/trpc";
import Navbar from "@/components/Navbar";

export default function ConfirmEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  const confirmMutation = trpc.candidateAuth.confirmEmail.useMutation({
    onSuccess: (data) => {
      setStatus("success");
      setMessage(data.message);
    },
    onError: (err) => {
      setStatus("error");
      setMessage(err.message || "حدث خطأ غير متوقع");
    },
  });

  useEffect(() => {
    if (token) {
      confirmMutation.mutate({ token });
    } else {
      setStatus("error");
      setMessage("رابط التأكيد غير صالح أو مفقود");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div className="min-h-screen bg-[#F8FAF9]">
      <Navbar />
      <div className="pt-24 pb-12 px-4 flex items-center justify-center min-h-[calc(100vh-80px)]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-md w-full"
        >
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
            {status === "loading" && (
              <>
                <div className="w-20 h-20 bg-[#4A9B8E]/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Loader2 className="w-10 h-10 text-[#4A9B8E] animate-spin" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">جاري التحقق...</h2>
                <p className="text-gray-500">يرجى الانتظار بينما نتحقق من بريدك الإلكتروني</p>
              </>
            )}

            {status === "success" && (
              <>
                <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="w-10 h-10 text-green-500" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">تم التأكيد بنجاح!</h2>
                <p className="text-gray-500 mb-6">{message}</p>
                <div className="space-y-3">
                  <Link to="/signin?redirect=/candidate-questionnaire">
                    <Button className="w-full bg-[#4A9B8E] hover:bg-[#3D7A6F] text-white">
                      <Mail className="w-4 h-4 mr-2" />
                      تسجيل الدخول
                    </Button>
                  </Link>
                </div>
              </>
            )}

            {status === "error" && (
              <>
                <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <XCircle className="w-10 h-10 text-red-500" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">خطأ في التأكيد</h2>
                <p className="text-gray-500 mb-6">{message}</p>
                <div className="space-y-3">
                  <Link to="/signin">
                    <Button variant="outline" className="w-full">
                      العودة لتسجيل الدخول
                    </Button>
                  </Link>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
