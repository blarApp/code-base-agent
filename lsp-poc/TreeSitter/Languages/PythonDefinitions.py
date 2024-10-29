from .LanguageDefinitions import LanguageDefinitions


import tree_sitter_python as tspython
from tree_sitter import Language

class PythonDefinitions(LanguageDefinitions):
    def get_language() -> Language:
        return Language(tspython.language())