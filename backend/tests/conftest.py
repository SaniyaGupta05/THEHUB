import pytest
from fastapi.testclient import TestClient
import sys
import os

# Add backend directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app
from app.db.init_db import init_db

@pytest.fixture(scope="session", autouse=True)
def setup_test_personas():
    init_db(reset_personas=True)

@pytest.fixture(scope="session")
def client():
    with TestClient(app) as test_client:
        yield test_client
