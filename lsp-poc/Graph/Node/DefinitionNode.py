from typing import List, Union, TYPE_CHECKING
from Graph.Relationship import RelationshipCreator
from .Node import Node

if TYPE_CHECKING:
    from .ClassNode import ClassNode
    from .FunctionNode import FunctionNode
    from Graph.Relationship import Relationship


class DefinitionNode(Node):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._defines: List[Union["ClassNode", "FunctionNode"]] = []

    def relate_node_as_define_relationship(
        self, node: Union["ClassNode", "FunctionNode"]
    ):
        self._defines.append(node)

    def relate_nodes_as_define_relationship(
        self, nodes: List[Union["ClassNode", "FunctionNode"]]
    ):
        self._defines.extend(nodes)

    def get_relationships(self) -> List["Relationship"]:
        relationships = []
        for node in self._defines:
            relationships.append(
                RelationshipCreator.create_defines_relationship(self, node)
            )

        return relationships
