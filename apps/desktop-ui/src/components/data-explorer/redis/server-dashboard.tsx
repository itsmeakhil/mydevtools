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
            <TabsList className="h-11 w-full shrink-0 justify-start gap-0.5 rounded-none border-b border-border bg-transparent px-2">
                <TabsTrigger value="info" className="h-7 rounded-md px-2.5 text-[13px] data-[state=active]:bg-foreground/[0.08] data-[state=active]:shadow-none">
                    <IconActivity className="mr-1.5 size-3.5" /> Server
                </TabsTrigger>
                <TabsTrigger value="slowlog" className="h-7 rounded-md px-2.5 text-[13px] data-[state=active]:bg-foreground/[0.08] data-[state=active]:shadow-none">
                    <IconClock className="mr-1.5 size-3.5" /> Slow log
                </TabsTrigger>
                <TabsTrigger value="clients" className="h-7 rounded-md px-2.5 text-[13px] data-[state=active]:bg-foreground/[0.08] data-[state=active]:shadow-none">
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
