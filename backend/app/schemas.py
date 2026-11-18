from urllib.parse import urlsplit

from pydantic import BaseModel, ConfigDict, EmailStr, Field, TypeAdapter, field_validator

class LoginInput(BaseModel):
    email: str
    password: str

class ProjectInput(BaseModel):
    title: str = Field(min_length=1, max_length=180)
    category: str = "Other"
    description: str = ""
    video_url: str = ""
    thumbnail_url: str = ""
    featured: bool = False
    sort_order: int = 0

class TeamInput(BaseModel):
    name: str = Field(min_length=1, max_length=180)
    role: str = ""
    bio: str = ""
    photo_url: str = ""
    social_url: str = ""
    sort_order: int = 0

class SettingsInput(BaseModel):
    studio_name: str
    tagline: str
    bio: str
    email: str = ""
    phone: str = ""
    location: str = ""
    whatsapp_number: str = ""
    booking_message: str = "Hi Pixel Wrld! I would like to book a video editing project. Please share your services, pricing, and availability."
    instagram_url: str = ""
    facebook_url: str = ""
    youtube_url: str = ""
    linkedin_url: str = ""
    tiktok_url: str = ""
    behance_url: str = ""
    pinterest_url: str = ""

    @field_validator("email")
    @classmethod
    def validate_business_email(cls, value: str) -> str:
        value = value.strip()
        if value:
            TypeAdapter(EmailStr).validate_python(value)
        return value

    @field_validator("phone", "whatsapp_number")
    @classmethod
    def validate_contact_phone(cls, value: str) -> str:
        value = value.strip()
        digits = sum(character.isdigit() for character in value)
        if value and (digits < 7 or digits > 20 or any(character not in "+0123456789 ().-" for character in value)):
            raise ValueError("Enter a valid phone number with country code")
        return value

    @field_validator(
        "instagram_url",
        "facebook_url",
        "youtube_url",
        "linkedin_url",
        "tiktok_url",
        "behance_url",
        "pinterest_url",
    )
    @classmethod
    def validate_social_url(cls, value: str) -> str:
        value = value.strip()
        if value:
            parsed = urlsplit(value)
            if parsed.scheme not in {"http", "https"} or not parsed.netloc:
                raise ValueError("Enter a complete URL beginning with https://")
        return value

class ProjectOut(ProjectInput):
    id: int
    model_config = ConfigDict(from_attributes=True)

class TeamOut(TeamInput):
    id: int
    model_config = ConfigDict(from_attributes=True)

class SettingsOut(SettingsInput):
    id: int
    model_config = ConfigDict(from_attributes=True)


class GoogleCredentialInput(BaseModel):
    credential: str = Field(min_length=20, max_length=10000)

class AdminGrantInput(BaseModel):
    email: EmailStr

class AdminAccessRequestOut(BaseModel):
    id: int
    email: str
    name: str
    picture: str
    status: str
    created_at: str | None = None

class AdminAccountOut(BaseModel):
    id: int
    email: str
    is_active: bool
    is_super_admin: bool


class ReviewInput(BaseModel):
    customer_name: str = Field(min_length=2, max_length=120)
    profile_image_url: str = Field(default="", max_length=1000)
    rating: int = Field(ge=1, le=5)
    review_text: str = Field(min_length=10, max_length=2000)
    project_name: str = Field(default="", max_length=180)
    status: str = Field(default="pending", pattern="^(pending|approved|rejected|hidden)$")

class ReviewOut(ReviewInput):
    id: int
    created_at: str | None = None
