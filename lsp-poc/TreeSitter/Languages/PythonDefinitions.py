from .LanguageDefinitions import LanguageDefinitions
from Graph.Relationship import RelationshipType

import tree_sitter_python as tspython
from tree_sitter import Language

from typing import Set


class PythonDefinitions(LanguageDefinitions):
    def get_language() -> Language:
        return Language(tspython.language())

    def get_capture_group_types() -> Set[str]:
        return {"class_definition", "function_definition"}

    def get_relationships_group_types() -> dict[str, RelationshipType]:
        return {
            "call": RelationshipType.CALLS,
            "interpolation": RelationshipType.CALLS,
            "import_from_statement": RelationshipType.IMPORTS,
            "superclasses": RelationshipType.INHERITS,
            "instantiation": RelationshipType.INSTANTIATES,
        }

    def get_function_call_query() -> str:
        return """
        (call function: _ @function_call)
        """

    def get_language_file_extensions() -> Set[str]:
        return {".py"}
