"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface FolderPageTabsProps {
  contentsTab: React.ReactNode
  permissionsTab: React.ReactNode
  showPermissionsTab: boolean
}

export function FolderPageTabs({
  contentsTab,
  permissionsTab,
  showPermissionsTab,
}: FolderPageTabsProps) {
  return (
    <Tabs defaultValue="contents">
      <TabsList variant="line">
        <TabsTrigger value="contents">Contents</TabsTrigger>
        {showPermissionsTab && (
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
        )}
      </TabsList>
      <TabsContent value="contents">{contentsTab}</TabsContent>
      {showPermissionsTab && (
        <TabsContent value="permissions">{permissionsTab}</TabsContent>
      )}
    </Tabs>
  )
}
