from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, Text, Date, JSON, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from .database import Base


class User(Base):
    """注册用户表，通过 user_id（UUID字符串）与所有业务数据关联"""
    __tablename__ = "users"

    id = Column(String(64), primary_key=True)           # UUID，全站通用的 user_id
    username = Column(String(64), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class PetProfile(Base):
    __tablename__ = "pet_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(64), index=True, nullable=False)
    name = Column(String(64), index=True, nullable=False)
    age = Column(Integer, nullable=True)
    age_unit = Column(String(16), nullable=True)
    gender = Column(String(16), nullable=True)
    pet_type = Column(String(32), nullable=True)
    breed = Column(String(64), nullable=True)
    weight = Column(Float, nullable=True)
    length = Column(Float, nullable=True)
    front_photo_path = Column(String(255), nullable=True)
    side_photo_path = Column(String(255), nullable=True)
    avatar_url = Column(String(512), nullable=True)  # Q版卡通头像URL
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    conversations = relationship("ConsultationMessage", back_populates="pet")
    toilet_records = relationship("ToiletRecord", back_populates="pet")
    daily_recipes = relationship("DailyRecipe", back_populates="pet")
    gene_records = relationship("GeneRecord", back_populates="pet")


class ConsultationMessage(Base):
    __tablename__ = "consultation_messages"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(64), index=True, nullable=False)
    pet_id = Column(Integer, ForeignKey("pet_profiles.id"), index=True, nullable=False)
    role = Column(String(16), nullable=False)  # user / assistant
    content = Column(Text, nullable=False)
    image_path = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    pet = relationship("PetProfile", back_populates="conversations")


class ConversationSummary(Base):
    """每个宠物的压缩对话摘要（= 毛博士的长期记忆）"""
    __tablename__ = "conversation_summaries"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(64), index=True, nullable=False)
    pet_id = Column(Integer, ForeignKey("pet_profiles.id"), index=True, nullable=False)
    summary = Column(Text, nullable=False)          # 压缩后的摘要文本
    covered_up_to_id = Column(Integer, nullable=False)  # 已压缩到第几条消息的 id
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    pet = relationship("PetProfile")


class ToiletRecord(Base):
    __tablename__ = "toilet_records"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(64), index=True, nullable=False)
    pet_id = Column(Integer, ForeignKey("pet_profiles.id"), index=True, nullable=False)
    type = Column(String(16), nullable=False)  # poop / pee
    image_path = Column(String(255), nullable=False)
    analysis_result = Column(JSON, nullable=True)  # {"status": "正常", "scores": {...}, "suggestion": "..."}
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    pet = relationship("PetProfile", back_populates="toilet_records")


class DailyRecipe(Base):
    __tablename__ = "daily_recipes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(64), index=True, nullable=False)
    pet_id = Column(Integer, ForeignKey("pet_profiles.id"), index=True, nullable=False)
    date = Column(Date, index=True, nullable=False)
    meals = Column(JSON, nullable=False)  # [{"time": "早餐", "dishes": [...], "calories": 285}, ...]
    nutrition_summary = Column(JSON, nullable=True)  # {"protein": {"current": 68, "target": 75}, ...}
    tips = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    pet = relationship("PetProfile", back_populates="daily_recipes")


class WeightRecord(Base):
    __tablename__ = "weight_records"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(64), index=True, nullable=False)
    pet_id = Column(Integer, ForeignKey("pet_profiles.id"), index=True, nullable=False)
    weight = Column(Float, nullable=False)  # 体重/kg
    recorded_at = Column(Date, index=True, nullable=False)
    note = Column(Text, nullable=True)  # 备注
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    pet = relationship("PetProfile")


class GeneRecord(Base):
    __tablename__ = "gene_records"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(64), index=True, nullable=False)
    pet_id = Column(Integer, ForeignKey("pet_profiles.id"), index=True, nullable=False)
    image_path = Column(String(255), nullable=True)
    analysis_result = Column(JSON, nullable=True)  # {"breeds": [...], "conclusion": "...", "traits": [...]}
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    pet = relationship("PetProfile", back_populates="gene_records")


class MealLog(Base):
    __tablename__ = "meal_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(64), index=True, nullable=False)
    pet_id = Column(Integer, ForeignKey("pet_profiles.id"), index=True, nullable=False)
    date = Column(Date, index=True, nullable=False)
    meal_type = Column(String(16), nullable=False)  # breakfast / lunch / dinner / snack
    items = Column(JSON, nullable=False)  # [{"name": "鸡胸肉", "amount": "50g", "emoji": "🍗"}]
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    pet = relationship("PetProfile")


class PhotoAnalysisRecord(Base):
    __tablename__ = "photo_analysis_records"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(64), index=True, nullable=False)
    pet_id = Column(Integer, ForeignKey("pet_profiles.id"), index=True, nullable=False)
    analysis_type = Column(String(16), nullable=False)  # fur / mood
    score = Column(Integer, nullable=True)
    detail = Column(Text, nullable=True)
    suggestion = Column(Text, nullable=True)
    mood = Column(String(32), nullable=True)  # only for mood type
    image_path = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    pet = relationship("PetProfile")


class MealDaySummary(Base):
    __tablename__ = "meal_day_summaries"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(64), index=True, nullable=False)
    pet_id = Column(Integer, ForeignKey("pet_profiles.id"), index=True, nullable=False)
    date = Column(Date, index=True, nullable=False)
    score = Column(Integer, nullable=True)
    analysis_result = Column(JSON, nullable=True)  # full comparison result
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    pet = relationship("PetProfile")


class PetSocialProfile(Base):
    __tablename__ = "pet_social_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(64), index=True, nullable=False)
    pet_id = Column(Integer, ForeignKey("pet_profiles.id"), index=True, nullable=False, unique=True)
    bio = Column(Text, nullable=True)                  # 自我介绍
    tags = Column(JSON, nullable=True)                  # ["疫苗已接种", "已绝育", ...]
    photo_paths = Column(JSON, nullable=True)           # ["/uploads/social/xxx.jpg", ...]
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    pet = relationship("PetProfile")
