import { MasterPricingForm } from "@/components/MasterPricingForm";
import Link from "next/link";

export default function MasterPricingPage() {
  return (
    <>
      <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/90 px-5 py-4 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Link href="/master/settings" className="text-xl text-gray-800">
            <i className="fa-solid fa-chevron-left" />
          </Link>
          <div className="flex-1">
            <div className="text-[17px] font-bold text-gray-900">요금 설정</div>
            <div className="text-[12px] text-gray-500">피드백 · 전화 · 방문 상담</div>
          </div>
          <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-bold text-master-500">
            마스터
          </span>
        </div>
      </header>
      <MasterPricingForm />
    </>
  );
}
