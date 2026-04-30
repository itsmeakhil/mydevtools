"""Dashboard analytics aggregates — read-only counts per authenticated user."""

from pydantic import BaseModel, Field

from app.api.routes.tasks.schema import TaskStatsOut


class DashboardAnalyticsOut(BaseModel):

    passwordEntries: int = Field(ge=0)
    bookmarks: int = Field(ge=0)
    bookmarkFolders: int = Field(ge=0)
    tasks: TaskStatsOut
    projects: int = Field(ge=0)
    nosqlConnections: int = Field(ge=0)
    notes: int = Field(ge=0)
    apiClientCollections: int = Field(ge=0)
    apiClientEnvironments: int = Field(ge=0)
    apiClientHistoryEntries: int = Field(ge=0)
    jsonFormatterDocuments: int = Field(ge=0)
    codeSnippets: int = Field(ge=0)
