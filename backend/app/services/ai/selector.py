from app.services.ai.providers.gemini import GeminiProvider
from app.services.ai.providers.llama import LlamaProvider
from app.services.ai.providers.fallback import FallbackProvider

class LLMSelector:
    @staticmethod
    def create(ai_provider: str):
        """
        Create an LLM provider based on the configured provider name.

        Args:
            ai_provider: Provider name, such as "gemini", "llama", or
                "fallback".

        Returns:
            An instance of the selected LLM provider.

        Raises:
            ValueError: If the provider name is not recognised.
        """
        if ai_provider == "fallback":
            return FallbackProvider()
        
        elif ai_provider == "gemini":
            return GeminiProvider()
        
        elif ai_provider == "llama":
            return LlamaProvider()

        else:
            raise ValueError(f"Unknown provider: {ai_provider}")
