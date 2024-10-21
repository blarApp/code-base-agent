from Graph.Node import Node, NodeLabels


class ClassNode(Node):
    def __init__(self, path: str, name: str):
        super().__init__(NodeLabels.CLASS, path)
        self.name = name

    def __str__(self):
        return super().__str__() + f"#{self.label}({self.name})"
