from abc import ABC, abstractmethod

class LLMProvider(ABC):
    @abstractmethod
    def generate_chat_response(self, history, summary, trip_details, conv_id, db, user):
        pass

    @abstractmethod
    def extract_trip_parameters(self, prompt,last_message, trip_details):
        pass

    @abstractmethod
    def create_summary(self, history):
        pass







