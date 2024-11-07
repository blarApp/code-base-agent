from .language_definitions import LanguageDefinitions
from graph.relationship import RelationshipType

import tree_sitter_python as tspython
from tree_sitter import Language

from typing import Set

from graph.node import NodeLabels
from tree_sitter import Node


class PythonDefinitions(LanguageDefinitions):
    def get_language() -> Language:
        return Language(tspython.language())

    def should_create_node(node: Node) -> bool:
        return node.type in {
            "class_definition",
            "function_definition",
        }

    def get_identifier_node(node: Node) -> Node:
        for child in node.children:
            if child.type == "identifier":
                return child
        raise Exception("No identifier node found")

    def get_body_node(node: Node) -> Node:
        for child in node.children:
            if child.type == "block":
                return child
        raise Exception("No body node found")

    def get_relationships_group_types() -> dict[str, RelationshipType]:
        return {
            NodeLabels.CLASS: {
                "import_from_statement": RelationshipType.IMPORTS,
                "superclasses": RelationshipType.INHERITS,
                "call": RelationshipType.INSTANTIATES,
                "typing": RelationshipType.TYPING,
                "assignment": RelationshipType.ASSIGNMENT,
            },
            NodeLabels.FUNCTION: {
                "call": RelationshipType.CALLS,
                "interpolation": RelationshipType.CALLS,
                "import_from_statement": RelationshipType.IMPORTS,
                "assignment": RelationshipType.ASSIGNMENT,
            },
        }

    def get_node_label_from_type(type: str) -> NodeLabels:
        return {
            "class_definition": NodeLabels.CLASS,
            "function_definition": NodeLabels.FUNCTION,
        }[type]

    def get_function_call_query() -> str:
        return """
        (call function: _ @function_call)
        """

    def get_language_file_extensions() -> Set[str]:
        return {".py"}
