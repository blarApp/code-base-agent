from Graph.Node import Node, NodeLabels
from .FileNode import FileNode
from typing import Union, List
from Graph.Relationship import RelationshipCreator, Relationship


class FolderNode(Node):
    def __init__(self, path: str):
        self._contains = []
        super().__init__(NodeLabels.FOLDER, path)

    def relate_node_as_contain_relationship(self, node: Union[FileNode, "FolderNode"]):
        if isinstance(node, FileNode) or isinstance(node, FolderNode):
            self._contains.append(node)
        else:
            raise Exception(
                "Folder node cannot contain node of type: " + type(node).__name__
            )

    def relate_nodes_as_contain_relationship(
        self, nodes: List[Union[FileNode, "FolderNode"]]
    ):
        for node in nodes:
            self.relate_node_as_contain_relationship(node)

    def get_relationships(self) -> List[Relationship]:
        relationships = []
        for node in self._contains:
            relationships.append(
                RelationshipCreator.create_contains_relationship(self, node)
            )

        return relationships
