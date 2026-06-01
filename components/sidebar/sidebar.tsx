"use client"

import { EntityInspector } from "@/components/sidebar/entity-inspector"
import { EntityList } from "@/components/sidebar/entity-list"
import { SearchPanel } from "@/components/sidebar/search-panel"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useGraphContext } from "@/store/graph-context"
import type { SidebarTab } from "@/store/graph-store"

export function Sidebar() {
    const { state, actions } = useGraphContext()

    return (
        <Tabs
            value={state.sidebarTab}
            onValueChange={(value) => actions.setSidebarTab(value as SidebarTab)}
            className="h-full"
        >
            <div className="p-2">
                <TabsList className="w-full">
                    <TabsTrigger value="entities">Entities</TabsTrigger>
                    <TabsTrigger value="details">Details</TabsTrigger>
                </TabsList>
            </div>
            <Separator />
            <TabsContent
                value="entities"
                className="flex min-h-0 flex-1 flex-col gap-0"
            >
                <div className="p-2">
                    <SearchPanel />
                </div>
                <Separator />
                <div className="min-h-0 flex-1">
                    <EntityList />
                </div>
            </TabsContent>
            <TabsContent value="details" className="min-h-0 flex-1">
                <EntityInspector />
            </TabsContent>
        </Tabs>
    )
}
