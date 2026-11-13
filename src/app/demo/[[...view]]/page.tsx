import { DashboardView } from "@/components/dashboard-view";

export const dynamic = "force-dynamic";
export default async function Demo({ params }: { params: Promise<{ view?: string[] }> }) {
  const { view = [] } = await params;
  return <DashboardView demo segments={view} />;
}
