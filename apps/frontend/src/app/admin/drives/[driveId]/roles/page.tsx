import { DriveRolesManager } from "@/components/admin/drive-roles-manager";

export default async function DriveRolesPage({
  params,
}: {
  params: Promise<{ driveId: string }>;
}) {
  const { driveId } = await params;
  return <DriveRolesManager driveId={driveId} />;
}
