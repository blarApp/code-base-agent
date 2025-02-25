from blarify.code_hierarchy.languages.FoundRelationshipScope import FoundRelationshipScope
from .language_definitions import LanguageDefinitions
from blarify.graph.relationship import RelationshipType

from tree_sitter_language_pack import get_parser
from tree_sitter import Language, Parser

from typing import Optional, Set, Dict

from blarify.graph.node import NodeLabels
from tree_sitter import Node
from blarify.graph.node import Node as GraphNode


class DartDefinitions(LanguageDefinitions):
    def get_language_name() -> str:
        return "dart"

    def get_parsers_for_extensions() -> Dict[str, Parser]:
        return {
            ".dart": get_parser("dart"),
        }

    def should_create_node(node: Node) -> bool:
        print(node.type)
        if node.type == "method_signature":
            pass
        return LanguageDefinitions._should_create_node_base_implementation(
            node,
            [
                "class_definition",
                "method_signature",
                "function_declaration",
            ],
        )

    def get_identifier_node(node: Node) -> Node:
        return LanguageDefinitions._get_identifier_node_base_implementation(node)

    def get_body_node(node: Node) -> Node:
        return LanguageDefinitions._get_body_node_base_implementation(node)

    def get_relationship_type(node: GraphNode, node_in_point_reference: Node) -> Optional[FoundRelationshipScope]:
        return DartDefinitions._find_relationship_type(
            node_label=node.label,
            node_in_point_reference=node_in_point_reference,
        )

    def get_node_label_from_type(type: str) -> NodeLabels:
        print(type)
        return {
            "class_definition": NodeLabels.CLASS,
            "method_signature": NodeLabels.FUNCTION,
            "function_declaration": NodeLabels.FUNCTION,
        }[type]

    def get_language_file_extensions() -> Set[str]:
        return {".dart"}

    def _find_relationship_type(node_label: str, node_in_point_reference: Node) -> Optional[FoundRelationshipScope]:
        relationship_types = DartDefinitions._get_relationship_types_by_label()
        relevant_relationship_types = relationship_types.get(node_label, {})

        return LanguageDefinitions._traverse_and_find_relationships(
            node_in_point_reference, relevant_relationship_types
        )

    def _get_relationship_types_by_label() -> dict[str, RelationshipType]:
        return {
            NodeLabels.CLASS: {
                "object_creation_expression": RelationshipType.INSTANTIATES,
                "using_directive": RelationshipType.IMPORTS,
                "variable_declaration": RelationshipType.TYPES,
                "parameter": RelationshipType.TYPES,
                "base_list": RelationshipType.INHERITS,
            },
            NodeLabels.FUNCTION: {
                "invocation_expression": RelationshipType.CALLS,
            },
        }
