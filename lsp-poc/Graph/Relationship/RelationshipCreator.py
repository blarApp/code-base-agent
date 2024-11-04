from collections import defaultdict
from typing import List, TYPE_CHECKING
from Graph.Relationship import Relationship, RelationshipType

if TYPE_CHECKING:
    from Graph.Node import Node, FileNode


class RelationshipCreator:
    @staticmethod
    def create_relationships_for_document_symbol_nodes_found_in_file(
        document_symbol_nodes: List["Node"], file_node: "Node"
    ):
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
        references: set, node: "Node", file_node_reference: "FileNode"
    ):
        try:
            FileNode
        except NameError:
            from Graph.Node import FileNode

        relationships = []
        for reference in references:
            if reference == node.path:
                continue

            node_referenced = file_node_reference.reference_search(reference)

            relationship = Relationship(
                start_node=node,
                end_node=node_referenced,
                rel_type=RelationshipType.USES,
            )
            relationships.append(relationship)
        return relationships

    @staticmethod
    def create_defines_relationship(node: "Node", defined_node: "Node"):
        return Relationship(
            node,
            defined_node,
            RelationshipType.DECLARES,
        )

    @staticmethod
    def create_contains_relationship(folder_node: "Node", contained_node: "Node"):
        return Relationship(
            folder_node,
            contained_node,
            RelationshipType.CONTAINS,
        )
