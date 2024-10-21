from Graph.Node import NodeLabels


class Node:
    def __init__(self, label: NodeLabels, path: str):
        self.label = label
        self.path = path
