import { headers } from "next/headers";
import { authenticate } from "@/lib/server/auth";
import { DashboardView } from "@/components/dashboard-view";

export const dynamic = "force-dynamic";
export default async function Dashboard({ params }: { params: Promise<{ view?: string[] }> }) {
  // Verify again at the data access boundary, including direct RSC navigation.
  if (!await authenticate((await headers()).get("authorization"))) return <p className="notice">인증이 필요합니다. 서버 인증 설정을 확인하세요.</p>;
  const { view = [] } = await params;
  return <DashboardView demo={false} segments={view} />;
}
