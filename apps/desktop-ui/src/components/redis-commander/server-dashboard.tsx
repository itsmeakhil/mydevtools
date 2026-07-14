"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IconActivity, IconClock, IconUsers } from "@tabler/icons-react";
import { InfoPane, SlowLogPane, ClientsPane } from "./server-dashboard-panes";

interface ServerDashboardProps {
    redisUrl: string;
    db: number;
}

export function ServerDashboard({ redisUrl, db }: ServerDashboardProps) {
    return (
        <Tabs defaultValue="info" className="h-full flex flex-col">
            <TabsList className="h-8 rounded-none border-b w-full justify-start gap-0 p-0 bg-transparent shrink-0">
                <TabsTrigger value="info" className="h-8 rounded-none border-r px-3 text-xs data-[state=active]:bg-accent data-[state=active]:shadow-none">
                    <IconActivity className="mr-1.5 size-3.5" /> Server
                </TabsTrigger>
                <TabsTrigger value="slowlog" className="h-8 rounded-none border-r px-3 text-xs data-[state=active]:bg-accent data-[state=active]:shadow-none">
                    <IconClock className="mr-1.5 size-3.5" /> Slow log
                </TabsTrigger>
                <TabsTrigger value="clients" className="h-8 rounded-none border-r px-3 text-xs data-[state=active]:bg-accent data-[state=active]:shadow-none">
                    <IconUsers className="mr-1.5 size-3.5" /> Clients
                </TabsTrigger>
            </TabsList>
            <TabsContent value="info" className="flex-1 min-h-0 mt-0">
                <InfoPane redisUrl={redisUrl} db={db} />
            </TabsContent>
            <TabsContent value="slowlog" className="flex-1 min-h-0 mt-0">
                <SlowLogPane redisUrl={redisUrl} db={db} />
            </TabsContent>
            <TabsContent value="clients" className="flex-1 min-h-0 mt-0">
                <ClientsPane redisUrl={redisUrl} db={db} />
            </TabsContent>
        </Tabs>
    );
}
