from pydantic import BaseModel

class POICreate(BaseModel):
    name: str
