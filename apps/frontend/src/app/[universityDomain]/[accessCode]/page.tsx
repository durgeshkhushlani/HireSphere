import { CompanyPortalView } from "@/components/company-portal/company-portal-view";

export default async function CompanyPortalPage({
  params,
}: {
  params: Promise<{ universityDomain: string; accessCode: string }>;
}) {
  const { universityDomain, accessCode } = await params;
  return <CompanyPortalView universityDomain={universityDomain} accessCode={accessCode} />;
}
