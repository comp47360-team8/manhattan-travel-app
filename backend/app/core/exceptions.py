
class UserAlreadyExists(Exception):
    """Raised when attempting to create an account for an existing user."""
    pass

class AuthenticationError(Exception):
    """Raised when user authentication fails."""
    pass

class POINotFoundError(Exception):
    """Raised when a requested point of interest cannot be found."""
    pass

class MaximumPOIsExceeded(Exception):
    """Raised when an itinerary exceeds the allowed number of POIs."""
    pass

class ItineraryNotFound(Exception):
    """Raised when the requested itinerary cannot be found."""
    pass

class POINotOpenDuringTrip(Exception):
    """Raised when a POI is not open during the user's trip."""
    pass

class StopNotFound(Exception):
    """Raised when a requested itinerary stop cannot be found."""
    pass

class RepeatingPOI(Exception):
    """Raised when the same POI is added more than once."""
    pass

class ConversationNotFoundError(Exception):
    """Raised when the requested conversation cannot be found."""
    pass

class LLMUnresponsiveError(Exception):
    """Raised when an LLM provider fails to respond."""
    pass

