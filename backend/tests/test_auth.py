from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_signup_missing_fields():
    response = client.post(
        "/auth/signup",
        json = {
            "password": "password123"
        }
    )

    assert response.status_code == 422

def test_login_success():
   response = client.post(
      "/auth/login",
      json = {
         "email": "user@example.com",
         "password":"string"
      }
   )

   assert response.status_code == 200
   data = response.json()
   assert data.get("access_token")
   assert data.get("refresh_token")

   

