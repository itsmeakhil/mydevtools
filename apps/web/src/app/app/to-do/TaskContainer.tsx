"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import TaskForm from "@/app/app/to-do/TaskForm";
import TaskList from "@/app/app/to-do/TaskList";
import KanbanBoard from "@/app/app/to-do/KanbanBoard";
import PaginationDemo from "@/app/app/to-do/PaginationS";
import ExportImportDialog from "@/app/app/to-do/ExportImportDialog";
import { useTaskContext } from "@/app/app/to-do/context/TaskContext";
import { useProjectContext } from "@/app/app/to-do/context/ProjectContext";
import { ListTodo, Circle, LayoutGrid, List, Search, X, Plus, Folder } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { STATUS_CONFIG } from "./config/constants";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/components/hooks/use-mobile";
import { useTranslations } from "next-intl";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectSeparator,
} from "@/components/ui/select";

export const TaskContainer = () => {
  const tPage = useTranslations("Tasks.page");
  const tFilters = useTranslations("Tasks.filters");
  const tStatus = useTranslations("Tasks.status");
  const tDrawer = useTranslations("Tasks.mobileDrawer");
  const isMobile = useIsMobile();
  const [viewMode, setViewMode] = useState<"list" | "kanban">("kanban");

  // Force list view on mobile when it mounts or changes
  useEffect(() => {
    if (isMobile) {
      setViewMode("list");
    }
  }, [isMobile]);

  const [searchQuery, setSearchQuery] = useState("");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const taskFormInputRef = useRef<HTMLInputElement>(null);
  const {
    tasks,
    isLoading,
    currentPage,
    totalPages,
    filterStatus,
    setFilterStatus,
    allTaskStats,
    fetchNextPage,
    fetchPreviousPage,
    handlePageChange,
    addTask,
    updateTask,
    updateTaskStatus,
    deleteTask,
    filterProject,
    setFilterProject,
  } = useTaskContext();
  const { projects } = useProjectContext();

  // Filter tasks based on search query
  const searchFilteredTasks = useMemo(() => {
    if (!searchQuery.trim()) return tasks;

    const query = searchQuery.toLowerCase();
    return tasks.filter(task => {
      // Search in task text
      if (task.text.toLowerCase().includes(query)) return true;

      // Search in description
      if (task.description?.toLowerCase().includes(query)) return true;

      // Search in tags
      if (task.tags?.some(tag => tag.name.toLowerCase().includes(query))) return true;

      // Search in subtasks
      if (task.subTasks?.some(st => st.text.toLowerCase().includes(query))) return true;

      return false;
    });
  }, [tasks, searchQuery]);

  // Filter tasks based on filterStatus for list view
  // For kanban view, always show all tasks (filtering is handled by columns)
  const filteredTasks = viewMode === "kanban" || filterStatus === "all"
    ? searchFilteredTasks
    : searchFilteredTasks.filter(task => task.status === filterStatus);

  const sortedTasks = [...filteredTasks].sort(
    (a: { status: "ongoing" | "not-started" | "completed" },
      b: { status: "ongoing" | "not-started" | "completed" }) => {
      const statusOrder: { [key in "ongoing" | "not-started" | "completed"]: number } = {
        ongoing: 1,
        "not-started": 2,
        completed: 3,
      };
      return statusOrder[a.status] - statusOrder[b.status];
    }
  );

  // Calculate statistics using all tasks stats
  const completionRate = allTaskStats.total > 0 ? Math.round((allTaskStats.completed / allTaskStats.total) * 100) : 0;

  const handleAddTask = (taskText: string) => {
    addTask(taskText);
    setIsDrawerOpen(false);
  };

  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const hasStatusFilter = filterStatus !== "all";
  const hasProjectFilter = filterProject !== "all";
  const hasSearchFilter = searchQuery.trim().length > 0;
  const hasActiveFilters = hasStatusFilter || hasProjectFilter || hasSearchFilter;
  const activeProject = projects.find((project) => project.id === filterProject);

  const clearAllFilters = () => {
    setSearchQuery("");
    setFilterStatus("all");
    setFilterProject("all");
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTypingInField =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      if (event.key === "/" && !isTypingInField) {
        event.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      if (event.key === "Escape" && hasSearchFilter) {
        setSearchQuery("");
        return;
      }

      if (!isMobile && event.key.toLowerCase() === "n" && !isTypingInField) {
        event.preventDefault();
        taskFormInputRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [hasSearchFilter, isMobile]);

  return (
    <div className="h-screen bg-background w-full flex flex-col overflow-hidden relative mobile-nav-offset">
      {/* Mobile-specific Header */}
      {isMobile && (
        <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-xl border-b pb-2 pt-2">
          <div className="flex items-center gap-2 px-4 py-2">
            <SidebarTrigger className="-ml-2 h-10 w-10 text-muted-foreground/80 hover:bg-transparent hover:text-foreground" />

            <div className="relative flex-1 h-10">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                placeholder={tFilters("searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10 bg-muted/50 border-transparent rounded-lg focus-visible:ring-1 text-sm placeholder:text-muted-foreground/70"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-muted/50 rounded-full"
                  onClick={() => setSearchQuery("")}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Title & Stats */}
          <div className="px-4 mt-1 mb-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{tPage("myTasksTitle")}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {tPage("statsLine", { total: allTaskStats.total, percent: completionRate })}
            </p>
          </div>

          {/* Scrollable Filters */}
          <div className="flex items-center gap-2 px-4 overflow-x-auto pb-2 scrollbar-hide">
            <Button
              variant={filterStatus === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterStatus("all")}
              className="h-8 rounded-full px-4 text-xs font-medium whitespace-nowrap flex-shrink-0"
            >
              {tFilters("all")}
            </Button>
            {Object.values(STATUS_CONFIG).map((config) => (
              <Button
                key={config.id}
                variant={filterStatus === config.id ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterStatus(config.id)}
                className={cn(
                  "h-8 rounded-full px-4 text-xs font-medium whitespace-nowrap flex-shrink-0 gap-1.5",
                  filterStatus === config.id ? config.bgColor + " " + config.color : ""
                )}
              >
                {/* Only show icon if active or if we want icons in chips */}
                {filterStatus === config.id && <config.icon className="h-3 w-3" />}
                {tStatus(`${config.id}.label` as any)}
                <span className={cn(
                  "ml-1 text-[10px] opacity-70",
                )}>
                  {config.id === "not-started" ? allTaskStats.notStarted :
                    config.id === "ongoing" ? allTaskStats.ongoing :
                      allTaskStats.completed}
                </span>
              </Button>
            ))}
          </div>
          {hasActiveFilters && (
            <div className="flex items-center gap-2 px-4 pb-2 overflow-x-auto scrollbar-hide">
              {hasStatusFilter && (
                <Badge variant="secondary" className="whitespace-nowrap">
                  {tStatus(`${filterStatus}.label` as any)}
                </Badge>
              )}
              {hasProjectFilter && activeProject && (
                <Badge variant="secondary" className="whitespace-nowrap gap-1.5">
                  <span className={cn("h-2 w-2 rounded-full", activeProject.color)} />
                  {activeProject.name}
                </Badge>
              )}
              {hasSearchFilter && (
                <Badge variant="secondary" className="whitespace-nowrap">
                  {searchQuery}
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="h-7 px-2"
                aria-label={tFilters("clearSearchAria")}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      )}

      <div className={cn(
        "flex flex-col flex-1 overflow-hidden",
        isMobile ? "px-0 pb-20" : "gap-3 px-2 md:px-4 lg:px-6 py-2 md:py-4"
      )}>
        {/* Desktop Header */}
        {!isMobile && (
          <Card className="border shadow-lg bg-card/50 backdrop-blur-sm">
            <CardHeader className="p-3 md:pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-primary/10 rounded-xl shadow-sm transition-all hover:bg-primary/20 hover:scale-105">
                    <ListTodo className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h1 className="text-lg md:text-xl font-bold tracking-tight text-foreground">
                      {tPage("myTasksTitle")}
                    </h1>
                    <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">
                      {tPage("statsLineDesktop", { total: allTaskStats.total, percent: completionRate })}
                    </p>
                  </div>
                </div>

                {/* Enhanced Stats with Progress Bars - Hidden on mobile to save space */}
                <div className="hidden lg:flex items-center gap-2">
                  <div className="flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-lg bg-muted/50 border">
                    <div className="flex items-center gap-1 text-xs font-medium">
                      <Circle className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-foreground">{allTaskStats.total}</span>
                    </div>
                    <span className="text-[9px] text-muted-foreground">{tFilters("total")}</span>
                  </div>

                  {Object.values(STATUS_CONFIG).map((config) => {
                    const count = config.id === "not-started"
                      ? allTaskStats.notStarted
                      : config.id === "ongoing"
                        ? allTaskStats.ongoing
                        : allTaskStats.completed;

                    return (
                      <div
                        key={config.id}
                        className={cn(
                          "flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-lg border",
                          config.bgColor,
                          config.borderColor
                        )}
                      >
                        <div className="flex items-center gap-1 text-xs font-medium">
                          <config.icon className={cn("h-3.5 w-3.5", config.color)} />
                          <span className={config.color}>{count}</span>
                        </div>
                        <span className="text-[9px] text-muted-foreground">{tStatus(`${config.id}.label` as any)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Enhanced Toolbar */}
              <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                {/* Enhanced Search */}
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    ref={searchInputRef}
                    type="text"
                    placeholder={tFilters("searchPlaceholder")}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-9 h-9 text-sm border focus-visible:ring-2 focus-visible:ring-primary/20 transition-all w-full"
                    aria-label={tFilters("searchAria")}
                  />
                  {searchQuery && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-muted"
                      onClick={() => setSearchQuery("")}
                      aria-label={tFilters("clearSearchAria")}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {/* Project Filter */}
                <Select value={filterProject} onValueChange={setFilterProject}>
                  <SelectTrigger className="w-[140px] h-9 text-xs">
                    <div className="flex items-center gap-2 truncate">
                      <Folder className="h-3.5 w-3.5 text-muted-foreground" />
                      <SelectValue placeholder={tFilters("allProjects")} />
                    </div>
                  </SelectTrigger>
                  <SelectContent align="end">
                    <SelectItem value="all" className="text-xs">{tFilters("allProjects")}</SelectItem>
                    {projects.length > 0 && <SelectSeparator />}
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id} className="text-xs">
                        <div className="flex items-center gap-2">
                          <div className={cn("w-2 h-2 rounded-full", project.color)} />
                          {project.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Export Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsExportDialogOpen(true)}
                  className="h-9 px-3 gap-2"
                >
                  <Folder className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline text-xs font-medium">{tFilters("export")}</span>
                </Button>

                {/* Enhanced View Toggle - Hidden on mobile since we force list view */}
                <div className="hidden md:block">
                  <ToggleGroup
                    type="single"
                    value={viewMode}
                    onValueChange={(value) => {
                      if (value) setViewMode(value as "list" | "kanban");
                    }}
                    className="border rounded-lg bg-muted/30 p-0.5 self-end sm:self-auto"
                  >
                    <ToggleGroupItem
                      value="kanban"
                      aria-label={tFilters("kanban")}
                      size="sm"
                      className="h-8 px-3 data-[state=on]:bg-background data-[state=on]:shadow-sm transition-all"
                    >
                      <LayoutGrid className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline ml-1.5 text-xs font-medium">{tFilters("kanban")}</span>
                    </ToggleGroupItem>
                    <ToggleGroupItem
                      value="list"
                      aria-label={tFilters("list")}
                      size="sm"
                      className="h-8 px-3 data-[state=on]:bg-background data-[state=on]:shadow-sm transition-all"
                    >
                      <List className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline ml-1.5 text-xs font-medium">{tFilters("list")}</span>
                    </ToggleGroupItem>
                  </ToggleGroup>
                </div>
              </div>
              {hasActiveFilters && (
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {hasStatusFilter && (
                    <Badge variant="secondary" className="gap-1.5">
                      {tStatus(`${filterStatus}.label` as any)}
                    </Badge>
                  )}
                  {hasProjectFilter && activeProject && (
                    <Badge variant="secondary" className="gap-1.5">
                      <span className={cn("h-2 w-2 rounded-full", activeProject.color)} />
                      {activeProject.name}
                    </Badge>
                  )}
                  {hasSearchFilter && (
                    <Badge variant="secondary">
                      {searchQuery}
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAllFilters}
                    className="h-7 px-2 text-xs"
                    aria-label={tFilters("clearSearchAria")}
                  >
                    <X className="h-3.5 w-3.5 mr-1" />
                    {tFilters("all")}
                  </Button>
                  <span className="ml-auto hidden lg:inline-flex items-center rounded-md border border-border/70 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    / search, N add, Esc clear
                  </span>
                </div>
              )}

              {/* Mobile Filter - Enhanced scrollable container */}
              {viewMode === "list" && (
                <div className="flex items-center gap-2 mt-2 overflow-x-auto pb-2 -mx-3 px-3 sm:mx-0 sm:px-0 scrollbar-hide">
                  <Button
                    variant={filterStatus === "all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilterStatus("all")}
                    className="h-7 px-2.5 text-xs whitespace-nowrap flex-shrink-0"
                    aria-label={tFilters("filterByAllAria")}
                  >
                    <ListTodo className="h-3 w-3 mr-1" />
                    {tFilters("all")}
                    <span className={cn(
                      "ml-1 px-1.5 py-0.5 rounded text-[9px]",
                      filterStatus === "all" ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                    )}>
                      {allTaskStats.total}
                    </span>
                  </Button>

                  {Object.values(STATUS_CONFIG).map((config) => {
                    const count = config.id === "not-started"
                      ? allTaskStats.notStarted
                      : config.id === "ongoing"
                        ? allTaskStats.ongoing
                        : allTaskStats.completed;

                    return (
                      <Button
                        key={config.id}
                        variant={filterStatus === config.id ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFilterStatus(config.id)}
                        className="h-7 px-2.5 text-xs whitespace-nowrap flex-shrink-0"
                        aria-label={tFilters("filterByStatusAria", { status: tStatus(`${config.id}.label` as any) })}
                      >
                        <config.icon className={cn("h-3 w-3 mr-1", config.color)} />
                        {tStatus(`${config.id}.label` as any)}
                        <span className={cn(
                          "ml-1 px-1.5 py-0.5 rounded text-[9px]",
                          filterStatus === config.id ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                        )}>
                          {count}
                        </span>
                      </Button>
                    );
                  })}
                </div>
              )}

              {/* Search Results Indicator */}
              {searchQuery && (
                <div className="flex items-center gap-2 mt-2 p-1.5 rounded-lg bg-muted/50 border">
                  <Search className="h-3.5 w-3.5 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">
                    {tFilters("foundTasks", { count: filteredTasks.length }).split(String(filteredTasks.length)).map((part, idx) =>
                      idx === 0 ? (
                        <span key={idx}>
                          {part}
                          <span className="font-semibold text-foreground">{filteredTasks.length}</span>
                        </span>
                      ) : (
                        <span key={idx}>{part}</span>
                      )
                    )}
                  </p>
                </div>
              )}
            </CardHeader>
          </Card>
        )}

        {/* Task Form - Hidden on mobile, visible on desktop */}
        <div className="hidden md:block">
          <TaskForm onAddTask={addTask} inputRef={taskFormInputRef} />
        </div>

        {/* Task View */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {viewMode === "kanban" ? (
            <Card className="border shadow-lg flex-1 overflow-hidden flex flex-col bg-muted/10">
              <CardContent className="p-2 md:p-4 flex-1 overflow-y-auto">
                <KanbanBoard
                  tasks={sortedTasks}
                  isLoading={isLoading}
                  onUpdateStatus={updateTaskStatus}
                  onUpdateTask={updateTask}
                  onDeleteTask={deleteTask}
                />
              </CardContent>
            </Card>
          ) : (
            <>
              {isMobile ? (
                /* Mobile List View - No Card Wrapper */
                <div className="flex-1 overflow-y-auto px-4 pt-2">
                  <TaskList
                    tasks={sortedTasks}
                    isLoading={isLoading}
                    onUpdateStatus={updateTaskStatus}
                    onUpdateTask={updateTask}
                    onDeleteTask={deleteTask}
                  />
                </div>
              ) : (
                /* Desktop List View - With Card Wrapper */
                <Card className="border shadow-lg flex-1 overflow-hidden flex flex-col">
                  <CardContent className="p-2 md:p-4 flex-1 overflow-y-auto">
                    <TaskList
                      tasks={sortedTasks}
                      isLoading={isLoading}
                      onUpdateStatus={updateTaskStatus}
                      onUpdateTask={updateTask}
                      onDeleteTask={deleteTask}
                    />
                  </CardContent>
                </Card>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center mt-4 mb-2">
                  <PaginationDemo
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onNextPage={fetchNextPage}
                    onPreviousPage={fetchPreviousPage}
                    onPageChange={handlePageChange}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Floating Action Button (FAB) - Mobile Only */}
      <div className="md:hidden">
        <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
          <DrawerTrigger asChild>
            <Button
              size="icon"
              className="fab fab-pulse h-14 w-14 bg-primary hover:bg-primary/90 text-primary-foreground transition-transform active:scale-95"
            >
              <Plus className="h-6 w-6" />
              <span className="sr-only">{tDrawer("addTaskSrOnly")}</span>
            </Button>
          </DrawerTrigger>
          <DrawerContent>
            <div className="mx-auto w-full max-w-sm">
              <DrawerHeader>
                <DrawerTitle>{tDrawer("addNewTaskTitle")}</DrawerTitle>
                <DrawerDescription>{tDrawer("addNewTaskDescription")}</DrawerDescription>
              </DrawerHeader>
              <div className="p-4 pb-0">
                <TaskForm onAddTask={handleAddTask} />
              </div>
              <DrawerFooter>
                <DrawerClose asChild>
                  <Button variant="outline">{tDrawer("cancel")}</Button>
                </DrawerClose>
              </DrawerFooter>
            </div>
          </DrawerContent>
        </Drawer>
      </div>

      <ExportImportDialog
        open={isExportDialogOpen}
        onOpenChange={setIsExportDialogOpen}
        tasks={tasks}
        projects={projects}
      />
    </div>
  );
};
