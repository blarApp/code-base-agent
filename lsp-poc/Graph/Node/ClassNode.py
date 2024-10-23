from Graph.Node import Node, NodeLabels


class ClassNode(Node):
    def __init__(self, name: str, path: str):
        super().__init__(NodeLabels.CLASS, path)
        self.name = name

    def __str__(self):
        return f"{self.label}({self.path})#{self.name}"
