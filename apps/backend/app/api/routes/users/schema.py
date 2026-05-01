from pydantic import BaseModel, Field
from app.api.routes.auth.schema import SocialLinks

class PublicUserProfileResponse(BaseModel):
    username: str
    display_name: str | None = None
    photo_url: str | None = None
    github_username: str | None = None
    bio: str | None = None
    social_links: SocialLinks | None = None
    tech_stacks: list[str] = Field(default_factory=list)
