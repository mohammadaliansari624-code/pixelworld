import unittest
from pydantic import ValidationError
from app.schemas import ReviewInput

class ReviewSchemaTests(unittest.TestCase):
    def test_valid_review_defaults_to_pending(self):
        review = ReviewInput(customer_name="A Customer", rating=5, review_text="Great editing and clear communication.")
        self.assertEqual(review.status, "pending")
        self.assertEqual(review.profile_image_url, "")

    def test_rating_must_be_between_one_and_five(self):
        with self.assertRaises(ValidationError):
            ReviewInput(customer_name="A Customer", rating=6, review_text="Great editing and clear communication.")

    def test_review_text_must_have_minimum_length(self):
        with self.assertRaises(ValidationError):
            ReviewInput(customer_name="A Customer", rating=5, review_text="Too short")

    def test_status_is_restricted(self):
        with self.assertRaises(ValidationError):
            ReviewInput(customer_name="A Customer", rating=5, review_text="Great editing and clear communication.", status="published")

if __name__ == "__main__":
    unittest.main()
