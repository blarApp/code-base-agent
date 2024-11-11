from .language_definitions import LanguageDefinitions
from graph.relationship import RelationshipType

import tree_sitter_python as tspython
from tree_sitter import Language, Parser

from typing import Optional, Set, Dict

from graph.node import NodeLabels
from tree_sitter import Node
from graph.node import Node as GraphNode


class PythonDefinitions(LanguageDefinitions):
    def get_parsers_for_extensions() -> Dict[str, Parser]:
        return {
            ".py": Parser(Language(tspython.language())),
        }

    def should_create_node(node: Node) -> bool:
        return node.type in {
            "class_definition",
            "function_definition",
        }

    def get_identifier_node(node: Node) -> Node:
        return LanguageDefinitions.get_identifier_node(node)

    def get_body_node(node: Node) -> Node:
        return LanguageDefinitions.get_body_node(node)

    def get_relationship_type(node: GraphNode, node_in_point_reference: Node) -> Optional[RelationshipType]:
        return PythonDefinitions._find_relationship_type(
            node_label=node.label,
            node_in_point_reference=node_in_point_reference,
        )

    def get_node_label_from_type(type: str) -> NodeLabels:
        return {
            "class_definition": NodeLabels.CLASS,
            "function_definition": NodeLabels.FUNCTION,
        }[type]

    def get_language_file_extensions() -> Set[str]:
        return {".py"}

    def _find_relationship_type(node_label: str, node_in_point_reference: Node) -> Optional[RelationshipType]:
        # Traverse up to find the named parent
        named_parent = node_in_point_reference
        rel_types = PythonDefinitions._get_relationships_group_types()
        type_found = None

        while named_parent is not None and type_found is None:
            type_found = PythonDefinitions._get_tree_sitter_node_relationship_type(
                tree_sitter_node=named_parent, relationships_types=rel_types[node_label]
            )
            named_parent = named_parent.parent
        return type_found

    def _get_tree_sitter_node_relationship_type(
        tree_sitter_node: Node, relationships_types: dict
    ) -> Optional[RelationshipType]:
        if tree_sitter_node is None:
            return None

        return relationships_types.get(tree_sitter_node.type, None)

    def _get_relationships_group_types() -> dict[str, RelationshipType]:
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
