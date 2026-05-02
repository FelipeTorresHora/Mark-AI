from pydantic import BaseModel, HttpUrl


class OAuthAuthorizationUrlResponse(BaseModel):
    authorization_url: HttpUrl
