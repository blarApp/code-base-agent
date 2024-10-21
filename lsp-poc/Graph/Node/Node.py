from Graph.Node import NodeLabels


class Node:
    def __init__(self, label: NodeLabels, path: str):
        self.label = label
        self.path = path

    @property
    def id(self):
        return self.path

    def __str__(self):
        return f"{self.label}({self.path})"
