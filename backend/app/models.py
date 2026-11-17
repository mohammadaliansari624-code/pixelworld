from datetime import datetime
from sqlalchemy import Boolean, DateTime, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column
from .database import Base

class Admin(Base):
    __tablename__ = "admins"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    google_sub: Mapped[str | None] = mapped_column(String(255), unique=True, index=True, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_super_admin: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

class AdminAccessRequest(Base):
    __tablename__ = "admin_access_requests"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    google_sub: Mapped[str] = mapped_column(String(255))
    name: Mapped[str] = mapped_column(String(255), default="")
    picture: Mapped[str] = mapped_column(String(1000), default="")
    status: Mapped[str] = mapped_column(String(20), default="pending", index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

class Project(Base):
    __tablename__ = "projects"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(180))
    category: Mapped[str] = mapped_column(String(80), default="Other")
    description: Mapped[str] = mapped_column(Text, default="")
    video_url: Mapped[str] = mapped_column(String(1000), default="")
    thumbnail_url: Mapped[str] = mapped_column(String(1000), default="")
    featured: Mapped[bool] = mapped_column(Boolean, default=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

class TeamMember(Base):
    __tablename__ = "team_members"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(180))
    role: Mapped[str] = mapped_column(String(180), default="")
    bio: Mapped[str] = mapped_column(Text, default="")
    photo_url: Mapped[str] = mapped_column(String(1000), default="")
    social_url: Mapped[str] = mapped_column(String(1000), default="")
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

class SiteSettings(Base):
    __tablename__ = "site_settings"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)
    studio_name: Mapped[str] = mapped_column(String(180), default="PIXEL WRLD")
    tagline: Mapped[str] = mapped_column(String(255), default="Stories in motion.")
    bio: Mapped[str] = mapped_column(Text, default="An independent creative studio shaping stories frame by frame.")
    email: Mapped[str] = mapped_column(String(255), default="")
    phone: Mapped[str] = mapped_column(String(80), default="")
    location: Mapped[str] = mapped_column(String(255), default="")
    whatsapp_number: Mapped[str] = mapped_column(String(30), default="+919503898739")
    booking_message: Mapped[str] = mapped_column(Text, default="Hi Pixel Wrld! I would like to book a video editing project. Please share your services, pricing, and availability.")
    instagram_url: Mapped[str] = mapped_column(String(1000), default="")
    facebook_url: Mapped[str] = mapped_column(String(1000), default="")
    youtube_url: Mapped[str] = mapped_column(String(1000), default="")
    linkedin_url: Mapped[str] = mapped_column(String(1000), default="")
    tiktok_url: Mapped[str] = mapped_column(String(1000), default="")
    behance_url: Mapped[str] = mapped_column(String(1000), default="")
    pinterest_url: Mapped[str] = mapped_column(String(1000), default="")
