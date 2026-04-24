from pydantic import BaseModel
from app.api.routes.auth.schema import SocialLinks

class PublicUserProfileResponse(BaseModel):
    username: str
    display_name: str | None = None
    photo_url: str | None = None
    github_username: str | None = None
    social_links: SocialLinks | None = None
