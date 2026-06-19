from pydantic import BaseModel

class RefreshTokenRequest(BaseModel):
    refresh_token: str

class RefreshTokenResponse(BaseModel):
    access_token: str
    refresh_token: str

    model_config = {"from_attributes": True}

class LogoutRequest(BaseModel):
    refresh_token: str

class LogoutResponse(BaseModel):
    message: str
