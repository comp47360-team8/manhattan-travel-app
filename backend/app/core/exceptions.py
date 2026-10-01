
class UserAlreadyExists(Exception):
    """Raised when attempting to create an account for an existing user."""

class AuthenticationError(Exception):
    """Raised when user authentication fails."""

class POINotFoundError(Exception):
    """Raised when a requested point of interest cannot be found."""

class MaximumPOIsExceeded(Exception):
    """Raised when an itinerary exceeds the allowed number of POIs."""

class ItineraryNotFound(Exception):
    """Raised when the requested itinerary cannot be found."""

class POINotOpenDuringTrip(Exception):
    """Raised when a POI is not open during the user's trip."""

class StopNotFound(Exception):
    """Raised when a requested itinerary stop cannot be found."""

class RepeatingPOI(Exception):
    """Raised when the same POI is added more than once."""

class ConversationNotFoundError(Exception):
    """Raised when the requested conversation cannot be found."""

class LLMUnresponsiveError(Exception):
    """Raised when an LLM provider fails to respond."""

