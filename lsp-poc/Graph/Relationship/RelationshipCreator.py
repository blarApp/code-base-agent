from typing import List
from Graph.Node import Node
from Graph.Relationship import Relationship, RelationshipType


class RelationshipCreator:
    @staticmethod
    def create_relationships_for_document_symbol_nodes_found_in_file(
        document_symbol_nodes: List[Node], file_node: Node
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
