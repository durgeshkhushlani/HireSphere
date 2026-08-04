import { DriveDetailsManager } from "@/components/admin/drive-details-manager";

export default async function DriveDetailsPage({
  params,
}: {
  params: Promise<{ driveId: string }>;
}) {
  const { driveId } = await params;
  return <DriveDetailsManager driveId={driveId} />;
}
