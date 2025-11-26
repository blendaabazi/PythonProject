import requests

BASE_URL = "http://127.0.0.1:8000"

if __name__ == "__main__":
    for path in ("/", "/hello"):
        resp = requests.get(BASE_URL + path, timeout=10)
        print(path, resp.status_code, resp.json())
