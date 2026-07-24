import json
from app.services.ai.base import LLMProvider
from app.services.ai.providers.gemini import GeminiProvider
from app.services.ai.providers.llama import LlamaProvider
from app.core.exceptions import LLMUnresponsiveError
from app.schemas.ai import ChatResponse

class FallbackProvider(LLMProvider):
    def __init__(self):
        self.primary = GeminiProvider()
        self.fallback = LlamaProvider()

    def extract_trip_parameters(self, prompt, last_message, trip_details):
        if isinstance(prompt, list):
            prompt = json.dumps(prompt)

        try:
            return self.primary.extract_trip_parameters(prompt, last_message, trip_details)
        except LLMUnresponsiveError as e:
            self._fallback_message(e)

            try:
                return self.fallback.extract_trip_parameters(prompt, last_message, trip_details)
            except LLMUnresponsiveError as e:
                print(f"Error occured during extraction: {e}")
                raise

    def generate_chat_response(self, history, summary, trip_details, conv_id, db, user):
        try:
            return self.primary.generate_chat_response(history, summary, trip_details, conv_id, db, user)
        except LLMUnresponsiveError as e:
            self._fallback_message(e)

            try:
                return self.fallback.generate_chat_response(history, summary, trip_details, conv_id, db, user)
            except LLMUnresponsiveError as e:
                print(f"Error occured during chat generation: {e}")
                return ChatResponse(
                    message="I'm having trouble responding right now. Please try again in a moment.",
                    ui_action=None,
                    itinerary=None,
                    save_to_history=False
                )
            
    def create_summary(self, history):
        try:
            return self.primary.create_summary(history)
        except LLMUnresponsiveError as e:
            self._fallback_message(e)

            return self.fallback.create_summary(history)
        
    def _fallback_message(self, e):
        print(f"Gemini failed: {e}")
        print("Switching to Llama")
            
