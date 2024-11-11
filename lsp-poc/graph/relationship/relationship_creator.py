from typing import List, TYPE_CHECKING
from graph.relationship import Relationship, RelationshipType

if TYPE_CHECKING:
    from graph.graph import Graph
    from graph.node import Node
    from code_hierarchy import TreeSitterHelper
    from code_references.types import Reference


class RelationshipCreator:
    @staticmethod
    def create_relationships_from_paths_where_node_is_referenced(
        references: list["Reference"], node: "Node", graph: "Graph", tree_sitter_helper: "TreeSitterHelper"
    ) -> List[Relationship]:
        relationships = []
        for reference in references:
            file_node_reference = graph.get_file_node_by_path(path=reference.uri)

            node_referenced = file_node_reference.reference_search(reference=reference)
            if node_referenced is None or node.id == node_referenced.id:
                continue

            reference_type = tree_sitter_helper.get_reference_type(
                original_node=node, reference=reference, node_referenced=node_referenced
            )

            relationship = Relationship(
                start_node=node,
                end_node=node_referenced,
                rel_type=reference_type,
            )
            relationships.append(relationship)
        return relationships

    @staticmethod
    def create_defines_relationship(node: "Node", defined_node: "Node") -> Relationship:
        rel_type = (
            RelationshipType.FUNCTION_DEFINITION
            if defined_node.label == "FUNCTION"
            else RelationshipType.CLASS_DEFINITION
        )
        return Relationship(
            node,
            defined_node,
            rel_type,
        )

    @staticmethod
    def create_contains_relationship(folder_node: "Node", contained_node: "Node") -> Relationship:
        return Relationship(
            folder_node,
            contained_node,
            RelationshipType.CONTAINS,
        )
