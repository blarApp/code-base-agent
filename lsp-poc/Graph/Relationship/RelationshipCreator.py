from typing import List, TYPE_CHECKING
from Graph.Relationship import Relationship, RelationshipType

if TYPE_CHECKING:
    from Graph.Graph import Graph
    from Graph.Node import Node
    from TreeSitter import TreeSitterHelper


class RelationshipCreator:
    @staticmethod
    def create_relationships_for_document_symbol_nodes_found_in_file(
        document_symbol_nodes: List["Node"], file_node: "Node"
    ) -> List[Relationship]:
        relationships = []
        for node in document_symbol_nodes:
            if node.path == file_node.path:
                relationship_type = RelationshipType.DECLARES
            else:
                relationship_type = RelationshipType.IMPORTS

            relationship = Relationship(
                file_node,
                node,
                relationship_type,
            )

            relationships.append(relationship)

        return relationships

    @staticmethod
    def create_relationships_from_paths_where_node_is_referenced(
        references: set, node: "Node", graph: "Graph", tree_sitter_helper: "TreeSitterHelper"
    ) -> List[Relationship]:
        relationships = []
        for reference in references:
            if reference == node.path:
                continue

            file_node_reference = graph.get_file_node_by_path(reference["uri"])

            node_referenced = file_node_reference.reference_search(reference)
            if node_referenced is None:
                continue

            reference_type = tree_sitter_helper.get_reference_type(reference, node_referenced)

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
