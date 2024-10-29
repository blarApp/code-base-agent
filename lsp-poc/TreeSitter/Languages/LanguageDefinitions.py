from abc import ABC, abstractmethod
from tree_sitter import Language
from typing import Set

class LanguageDefinitions(ABC):
    @staticmethod
    @abstractmethod
    def get_language() -> Language:
        pass

    @staticmethod
    @abstractmethod
    def get_capture_group_types() -> Set[str]:
        pass
    
    