import pytest
from fastapi import HTTPException

from app.security import current_admin
from app.main import app


def test_admin_api_dependency_requires_a_token():
    with pytest.raises(HTTPException) as error:
        current_admin(None, None)
    assert error.value.status_code == 401


def test_google_is_the_only_admin_login_route():
    paths = {route.path for route in app.routes}
    assert "/api/auth/google" in paths
    assert not {"/api/auth/login", "/api/admin/login", "/api/admin/register"} & paths


def test_every_admin_api_route_depends_on_current_admin():
    def authenticated(dependant):
        return dependant.call is current_admin or any(authenticated(child) for child in dependant.dependencies)

    routes = [route for route in app.routes if getattr(route, "path", "").startswith("/api/admin/")]
    assert routes
    assert all(authenticated(route.dependant) for route in routes)
