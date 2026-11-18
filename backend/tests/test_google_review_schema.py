from app.schemas import GoogleReviewInput

def test_google_review_requires_credential_and_valid_rating():
    data = GoogleReviewInput(
        credential="x" * 30,
        rating=5,
        review_text="Excellent editing and communication.",
        project_name="Reels",
    )
    assert data.rating == 5
    assert data.project_name == "Reels"

def test_google_review_rejects_invalid_rating():
    try:
        GoogleReviewInput(credential="x" * 30, rating=6, review_text="Excellent editing and communication.")
    except Exception:
        return
    raise AssertionError("rating above five must be rejected")
