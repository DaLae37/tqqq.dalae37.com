import { DashboardView } from "@/components/dashboard-view";

export const dynamic = "force-dynamic";
export default async function Dashboard({ params }: { params: Promise<{ view?: string[] }> }) {
  const { view = [] } = await params;
  return <DashboardView segments={view} />;
}
