from abc import ABC, abstractmethod
from tree_sitter import Language


class LanguageDefinitions(ABC):
    @staticmethod
    @abstractmethod
    def get_language() -> Language:
        pass
    
    