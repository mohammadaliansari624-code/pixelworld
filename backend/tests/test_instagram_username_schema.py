from pydantic import ValidationError
import pytest

from app.schemas import SettingsInput


def settings(**overrides):
    values = {
        "studio_name": "PIXEL WRLD",
        "tagline": "Stories in motion.",
        "bio": "A creative studio.",
        **overrides,
    }
    return SettingsInput(**values)


def test_instagram_username_strips_at_prefix_and_whitespace():
    assert settings(instagram_username="  @pixel.wrld_  ").instagram_username == "pixel.wrld_"


@pytest.mark.parametrize("username", ["two words", "pixel-wrld", "name/other", "x" * 31])
def test_instagram_username_rejects_invalid_characters_or_length(username):
    with pytest.raises(ValidationError):
        settings(instagram_username=username)
