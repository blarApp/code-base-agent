from Graph.Node import Node, NodeLabels


class MethodNode(Node):
    def __init__(self, path: str, name: str, class_name: str):
        super().__init__(NodeLabels.METHOD, path)
        self.name = name
        self.class_name = class_name

    def __str__(self):
        return f"{self.label}({self.path}).{self.name}"
