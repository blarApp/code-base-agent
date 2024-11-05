from .LanguageDefinitions import LanguageDefinitions


import tree_sitter_python as tspython
from tree_sitter import Language

from typing import Set


class PythonDefinitions(LanguageDefinitions):
    def get_language() -> Language:
        return Language(tspython.language())

    def get_capture_group_types() -> Set[str]:
        return {"class_definition", "function_definition"}

    def get_language_file_extensions() -> Set[str]:
        return {".py"}
