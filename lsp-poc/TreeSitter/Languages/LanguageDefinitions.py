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

    @staticmethod
    @abstractmethod
    def get_function_call_query() -> str:
        pass

    @staticmethod
    @abstractmethod
    def get_language_file_extensions() -> Set[str]:
        pass
