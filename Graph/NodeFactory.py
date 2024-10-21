from Graph.Node import NodeLabels
from Graph.Node import Node


class NodeFactory:
    @staticmethod
    def create(label: NodeLabels, path: str):
        return Node(label, path)
