"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DriveManager } from "./drive-manager";
import { ApplicantsPanel } from "./applicants-panel";
import { PlacementsOverview } from "./placements-overview";
import { ProgramsManager } from "./programs-manager";
import { CompaniesManager } from "./companies-manager";
import { StudentsManager } from "./students-manager";
import { NotificationsManager } from "./notifications-manager";

const TAB_TRIGGER_CLASS =
  "rounded-full border border-border bg-card px-4 shadow-sm data-active:border-transparent data-active:bg-foreground data-active:text-background data-active:hover:text-background dark:data-active:bg-foreground dark:data-active:text-background dark:data-active:hover:text-background";

export function AdminDashboard() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-8 sm:px-8">
      <h1 className="font-heading text-2xl font-extrabold">Placement Cell</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Manage company drives and review applicants moving through your pipeline.
      </p>

      <Tabs defaultValue="drives" className="mt-6">
        {/* 7 tabs never fit a phone-width screen — scroll horizontally
            instead of silently overflowing the viewport. */}
        <div className="-mx-6 overflow-x-auto px-6 sm:mx-0 sm:px-0">
          <TabsList className="w-max gap-2 bg-transparent p-0">
            <TabsTrigger value="drives" className={TAB_TRIGGER_CLASS}>Drives</TabsTrigger>
            <TabsTrigger value="applicants" className={TAB_TRIGGER_CLASS}>Applicants</TabsTrigger>
            <TabsTrigger value="placements" className={TAB_TRIGGER_CLASS}>Placements</TabsTrigger>
            <TabsTrigger value="programs" className={TAB_TRIGGER_CLASS}>Programs</TabsTrigger>
            <TabsTrigger value="companies" className={TAB_TRIGGER_CLASS}>Companies</TabsTrigger>
            <TabsTrigger value="students" className={TAB_TRIGGER_CLASS}>Students</TabsTrigger>
            <TabsTrigger value="notifications" className={TAB_TRIGGER_CLASS}>Notifications</TabsTrigger>
          </TabsList>
        </div>
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
        <TabsContent value="companies" className="mt-6">
          <CompaniesManager />
        </TabsContent>
        <TabsContent value="students" className="mt-6">
          <StudentsManager />
        </TabsContent>
        <TabsContent value="notifications" className="mt-6">
          <NotificationsManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
