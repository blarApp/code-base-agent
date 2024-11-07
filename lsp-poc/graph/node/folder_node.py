from graph.node import Node, NodeLabels
from .file_node import FileNode
from typing import Union, List
from graph.relationship import RelationshipCreator, Relationship


class FolderNode(Node):
    path: str
    name: str
    level: int

    def __init__(self, path: str, name: str, level: int, *args, **kwargs):
        self._contains = []
        super().__init__(NodeLabels.FOLDER, path, name, level, *args, **kwargs)

    @property
    def node_repr_for_identifier(self) -> str:
        return self.path

    def relate_node_as_contain_relationship(self, node: Union[FileNode, "FolderNode"]) -> None:
        if isinstance(node, FileNode) or isinstance(node, FolderNode):
            self._contains.append(node)
        else:
            raise Exception("Folder node cannot contain node of type: " + type(node).__name__)

    def relate_nodes_as_contain_relationship(self, nodes: List[Union[FileNode, "FolderNode"]]) -> None:
        for node in nodes:
            self.relate_node_as_contain_relationship(node)

    def get_relationships(self) -> List[Relationship]:
        relationships = []
        for node in self._contains:
            relationships.append(RelationshipCreator.create_contains_relationship(self, node))

        return relationships
