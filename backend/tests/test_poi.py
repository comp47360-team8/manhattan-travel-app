from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_get_all_pois():
  response = client.get("/pois")

  assert response.status_code == 200

def test_get_poi_by_slug_success():
  slug = "times-square"

  response = client.get(f"/pois/{slug}")

  assert response.status_code == 200
  data = response.json()

  assert data["slug"] == slug

def test_get_poi_by_slug_fail():
  slug = "temple-bar"

  response = client.get(f"/pois/{slug}")

  assert response.status_code == 404
  assert response.json()["detail"] == "Destination not found."