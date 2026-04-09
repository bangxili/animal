from __future__ import annotations

from datetime import date, datetime
from typing import Any, Optional

from pydantic import BaseModel


class PetProfileCreate(BaseModel):
    user_id: str
    name: str
    age: Optional[int] = None
    age_unit: Optional[str] = None
    gender: Optional[str] = None
    pet_type: Optional[str] = None
    breed: Optional[str] = None
    weight: Optional[float] = None
    length: Optional[float] = None


class PetProfileOut(BaseModel):
    id: int
    user_id: str
    name: str
    age: Optional[int] = None
    age_unit: Optional[str] = None
    gender: Optional[str] = None
    pet_type: Optional[str] = None
    breed: Optional[str] = None
    weight: Optional[float] = None
    length: Optional[float] = None
    front_photo_path: Optional[str] = None
    side_photo_path: Optional[str] = None
    avatar_url: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ConsultationMessageOut(BaseModel):
    id: int
    user_id: str
    pet_id: int
    role: str
    content: str
    image_path: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ConsultationAskOut(BaseModel):
    answer: str


class ToiletRecordOut(BaseModel):
    id: int
    user_id: str
    pet_id: int
    type: str
    image_path: str
    analysis_result: Optional[dict[str, Any]] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ToiletAnalyzeOut(BaseModel):
    record_id: int
    status: str
    scores: dict[str, int]
    suggestion: str


class DailyRecipeOut(BaseModel):
    id: int
    user_id: str
    pet_id: int
    date: date
    meals: list[dict[str, Any]]
    nutrition_summary: Optional[dict[str, Any]] = None
    tips: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class WeightRecordCreate(BaseModel):
    user_id: str
    pet_id: int
    weight: float
    note: Optional[str] = None


class WeightRecordOut(BaseModel):
    id: int
    user_id: str
    pet_id: int
    weight: float
    recorded_at: date
    note: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class GeneRecordOut(BaseModel):
    id: int
    user_id: str
    pet_id: int
    image_path: Optional[str] = None
    analysis_result: Optional[dict[str, Any]] = None
    created_at: datetime

    class Config:
        from_attributes = True


class MealLogOut(BaseModel):
    id: int
    user_id: str
    pet_id: int
    date: date
    meal_type: str
    items: list[dict[str, Any]]
    created_at: datetime

    class Config:
        from_attributes = True


class SocialProfileOut(BaseModel):
    id: int
    user_id: str
    pet_id: int
    bio: Optional[str] = None
    tags: Optional[list[str]] = None
    photo_paths: Optional[list[str]] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SocialProfileUpdate(BaseModel):
    bio: Optional[str] = None
    tags: Optional[list[str]] = None
