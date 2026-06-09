from app.models import Feedback, Like, Match, Message, Profile

# Entity name (as used by the frontend SDK) -> SQLAlchemy model.
ENTITIES = {
    "Profile": Profile,
    "Match": Match,
    "Message": Message,
    "Like": Like,
    "Feedback": Feedback,
}

# Entities that should broadcast realtime events on write (for instant chat).
REALTIME_ENTITIES = {"Message", "Match"}


def get_model(entity: str):
    return ENTITIES.get(entity)
