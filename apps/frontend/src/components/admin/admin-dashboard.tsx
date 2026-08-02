"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DriveManager } from "./drive-manager";
import { ApplicantsPanel } from "./applicants-panel";
import { PlacementsOverview } from "./placements-overview";
import { ProgramsManager } from "./programs-manager";

export function AdminDashboard() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-8 sm:px-8">
      <h1 className="font-heading text-2xl font-extrabold">Placement Cell</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Manage company drives and review applicants moving through your pipeline.
      </p>

      <Tabs defaultValue="drives" className="mt-6">
        <TabsList>
          <TabsTrigger value="drives">Drives</TabsTrigger>
          <TabsTrigger value="applicants">Applicants</TabsTrigger>
          <TabsTrigger value="placements">Placements</TabsTrigger>
          <TabsTrigger value="programs">Programs</TabsTrigger>
        </TabsList>
        <TabsContent value="drives" className="mt-6">
          <DriveManager />
        </TabsContent>
        <TabsContent value="applicants" className="mt-6">
          <ApplicantsPanel />
        </TabsContent>
        <TabsContent value="placements" className="mt-6">
          <PlacementsOverview />
        </TabsContent>
        <TabsContent value="programs" className="mt-6">
          <ProgramsManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
