
class UserAlreadyExists(Exception):
    pass

class AuthenticationError(Exception):
    pass

class POINotFoundError(Exception):
    pass

class MaximumPOIsExceeded(Exception):
    pass

class ItineraryNotFound(Exception):
    pass


class POINotOpenDuringTrip(Exception):
    pass

class StopNotFound(Exception):
    pass

class RepeatingPOI(Exception):
    pass

